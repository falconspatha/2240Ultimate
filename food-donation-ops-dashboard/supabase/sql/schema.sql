CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) tblDonor
CREATE TABLE IF NOT EXISTS tblDonor (
    DonorID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Type VARCHAR(50),
    Phone VARCHAR(50),
    Address TEXT,
    District VARCHAR(100),
    Created_At TIMESTAMPTZ DEFAULT NOW()
);

-- 2) tblProduct
CREATE TABLE IF NOT EXISTS tblProduct (
    ProductID SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    Category VARCHAR(100),
    Unit_Weight_kg DECIMAL(10, 2),
    Temp_Requirement VARCHAR(100)
);

-- 3) tblStorageZone
CREATE TABLE IF NOT EXISTS tblStorageZone (
    ZoneID SERIAL PRIMARY KEY,
    Zone_Name VARCHAR(100) NOT NULL,
    Temp_Band VARCHAR(100),
    Capacity_kg DECIMAL(10, 2),
    Notes TEXT
);

-- 4) tblDonationLot
CREATE TABLE IF NOT EXISTS tblDonationLot (
    LotID SERIAL PRIMARY KEY,
    DonorID INT REFERENCES tblDonor(DonorID) ON DELETE SET NULL,
    ProductID INT REFERENCES tblProduct(ProductID) ON DELETE CASCADE,
    LotCode TEXT,
    Quantity_Units INT NOT NULL,
    Unit_Weight_kg DECIMAL(10, 2),
    Expiry_Date DATE,
    Received_Date DATE DEFAULT CURRENT_DATE,
    Temp_Requirement VARCHAR(100),
    StoredZoneID INT REFERENCES tblStorageZone(ZoneID),
    Status VARCHAR(50) DEFAULT 'Received',
    Notes TEXT
);

-- Keep LotCode present and auto-generated even for existing databases
ALTER TABLE tblDonationLot
  ADD COLUMN IF NOT EXISTS LotCode TEXT;

CREATE OR REPLACE FUNCTION fn_set_lot_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.LotID IS NULL THEN
    NEW.LotID := nextval(pg_get_serial_sequence('tbldonationlot', 'lotid'));
  END IF;

  IF NEW.LotCode IS NULL OR btrim(NEW.LotCode) = '' THEN
    NEW.LotCode := 'LOT-' ||
      to_char(COALESCE(NEW.Received_Date, CURRENT_DATE), 'YYYYMMDD') ||
      '-' ||
      lpad(NEW.LotID::text, 6, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lot_code ON tblDonationLot;
CREATE TRIGGER trg_set_lot_code
BEFORE INSERT ON tblDonationLot
FOR EACH ROW
EXECUTE FUNCTION fn_set_lot_code();

UPDATE tblDonationLot
SET LotCode = 'LOT-' || to_char(COALESCE(Received_Date, CURRENT_DATE), 'YYYYMMDD') || '-' || lpad(LotID::text, 6, '0')
WHERE LotCode IS NULL OR btrim(LotCode) = '';

ALTER TABLE tblDonationLot
  ALTER COLUMN LotCode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tblDonationLot_lotcode_key'
  ) THEN
    ALTER TABLE tblDonationLot
      ADD CONSTRAINT "tblDonationLot_lotcode_key" UNIQUE (LotCode);
  END IF;
END $$;

-- 5) tblInventory
CREATE TABLE IF NOT EXISTS tblInventory (
    InventoryID SERIAL PRIMARY KEY,
    LotID INT REFERENCES tblDonationLot(LotID) ON DELETE CASCADE,
    ZoneID INT REFERENCES tblStorageZone(ZoneID) ON DELETE CASCADE,
    On_Hand_Units INT DEFAULT 0,
    On_Hand_kg DECIMAL(10, 2) DEFAULT 0,
    Last_Updated TIMESTAMPTZ DEFAULT NOW()
);

-- 6) tblBeneficiary
CREATE TABLE IF NOT EXISTS tblBeneficiary (
    BeneficiaryID SERIAL PRIMARY KEY,
    Beneficiary_Name VARCHAR(255) NOT NULL,
    Contact_Name VARCHAR(255),
    Phone VARCHAR(50),
    Address TEXT,
    District VARCHAR(100),
    Latitude DECIMAL(9, 6),
    Longitude DECIMAL(9, 6),
    Has_Cold_Storage BOOLEAN DEFAULT FALSE,
    Created_At TIMESTAMPTZ DEFAULT NOW()
);

-- 7) tblOrders
CREATE TABLE IF NOT EXISTS tblOrders (
    OrderID SERIAL PRIMARY KEY,
    BeneficiaryID INT REFERENCES tblBeneficiary(BeneficiaryID) ON DELETE CASCADE,
    Order_Date TIMESTAMPTZ DEFAULT NOW(),
    Status VARCHAR(50) DEFAULT 'Pending',
    Priority VARCHAR(20),
    Notes TEXT
);

-- 8) tblOrderLine
CREATE TABLE IF NOT EXISTS tblOrderLine (
    OrderLineID SERIAL PRIMARY KEY,
    OrderID INT REFERENCES tblOrders(OrderID) ON DELETE CASCADE,
    ProductID INT REFERENCES tblProduct(ProductID),
    Qty_Units INT NOT NULL,
    Notes TEXT
);

-- 9) tblPickAllocation
CREATE TABLE IF NOT EXISTS tblPickAllocation (
    AllocationID SERIAL PRIMARY KEY,
    OrderLineID INT REFERENCES tblOrderLine(OrderLineID) ON DELETE CASCADE,
    InventoryID INT REFERENCES tblInventory(InventoryID),
    Alloc_Units INT NOT NULL,
    Alloc_kg DECIMAL(10, 2),
    Picked BOOLEAN DEFAULT FALSE
);

-- 10) tblZoneCapacityLog
CREATE TABLE IF NOT EXISTS tblZoneCapacityLog (
    LogID SERIAL PRIMARY KEY,
    ZoneID INT REFERENCES tblStorageZone(ZoneID) ON DELETE CASCADE,
    Log_Date DATE DEFAULT CURRENT_DATE,
    Used_kg DECIMAL(10, 2)
);

-- Dynamic page state
CREATE TABLE IF NOT EXISTS tblUserPage (
    PageID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    UserID UUID NOT NULL,
    Path TEXT NOT NULL,
    Title TEXT,
    State JSONB DEFAULT '{}'::jsonb,
    Created_At TIMESTAMPTZ DEFAULT NOW()
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS tblAdminAuditLog (
    LogID UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
