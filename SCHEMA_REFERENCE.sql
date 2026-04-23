create table public."tblBeneficiary" (
  "BeneficiaryID" bigint generated always as identity not null,
  "BeneficiaryName" text not null,
  "ContactName" text not null,
  "Phone" text not null,
  "Address" text null,
  "District" text null,
  "Latitude" double precision null,
  "Longitude" double precision null,
  "HasColdStorage" boolean not null,
  "CreatedAt" date not null,
  constraint tblBeneficiary_pkey primary key ("BeneficiaryID")
) TABLESPACE pg_default;

create table public."tblDonationLot" (
  "LotID" bigint generated always as identity not null,
  "DonorID" bigint not null,
  "ProductID" bigint not null,
  "LotCode" text not null,
  "QuantityUnits" bigint not null,
  "UnitWeightKg" double precision not null,
  "TotalWeightKg" double precision not null,
  "ExpiryDate" date not null,
  "ReceivedDate" date not null,
  "TempRequirement" text not null,
  "SuggestedZoneID" text null,
  "StoredZoneID" bigint not null,
  "Status" text not null,
  "Notes" text null,
  constraint tblDonationLot_pkey primary key ("LotID"),
  constraint fk_lot_donor foreign KEY ("DonorID") references "tblDonor" ("DonorID"),
  constraint fk_lot_product foreign KEY ("ProductID") references "tblProduct" ("ProductID")
) TABLESPACE pg_default;

create table public."tblDonor" (
  "DonorID" bigint generated always as identity not null,
  "DonorName" text not null,
  "DonorType" text not null,
  "Phone" text not null,
  "Email" text not null,
  "Address" text not null,
  "District" text not null,
  "CreatedAt" date not null,
  constraint tblDonor_pkey primary key ("DonorID")
) TABLESPACE pg_default;

create table public."tblInventory" (
  "InventoryID" bigint generated always as identity not null,
  "LotID" bigint not null,
  "ZoneID" bigint not null,
  "OnHandUnits" text not null,
  "OnHandKg" text not null,
  "LastUpdated" date not null,
  constraint tblInventory_pkey primary key ("InventoryID"),
  constraint tblInventory_LotID_fkey foreign KEY ("LotID") references "tblDonationLot" ("LotID"),
  constraint tblInventory_ZoneID_fkey foreign KEY ("ZoneID") references "tblStorageZone" ("ZoneID")
) TABLESPACE pg_default;

create table public."tblOrderLine" (
  "OrderLineID" bigint generated always as identity not null,
  "OrderID" bigint not null,
  "ProductID" bigint not null,
  "QtyUnits" bigint not null,
  "Notes" text null,
  constraint tblOrderLine_pkey primary key ("OrderLineID"),
  constraint fk_orderline_order foreign KEY ("OrderID") references "tblOrders" ("OrderID"),
  constraint fk_orderline_product foreign KEY ("ProductID") references "tblProduct" ("ProductID")
) TABLESPACE pg_default;

create table public."tblOrders" (
  "OrderID" bigint generated always as identity not null,
  "BeneficiaryID" bigint not null,
  "OrderDate" date not null,
  "RequiredDeliveryDate" date null,
  "Status" text not null,
  "Priority" bigint not null,
  "Notes" text null,
  constraint tblOrders_pkey primary key ("OrderID"),
  constraint fk_orders_beneficiary foreign KEY ("BeneficiaryID") references "tblBeneficiary" ("BeneficiaryID")
) TABLESPACE pg_default;

create table public."tblPickAllocation" (
  "AllocationID" bigint generated always as identity not null,
  "OrderLineID" bigint not null,
  "InventoryID" bigint not null,
  "AllocUnits" bigint not null,
  "AllocKg" double precision not null,
  "PickedAt" date not null,
  "FEFOSeq" bigint not null,
  constraint tblPickAllocation_pkey primary key ("AllocationID"),
  constraint fk_pick_inventory foreign KEY ("InventoryID") references "tblInventory" ("InventoryID"),
  constraint fk_pick_orderline foreign KEY ("OrderLineID") references "tblOrderLine" ("OrderLineID")
) TABLESPACE pg_default;

create table public."tblProduct" (
  "ProductID" bigint generated always as identity not null,
  "ProductName" text not null,
  "Category" text not null,
  "UnitWeightKg" double precision not null,
  "TempRequirement" text not null,
  "ShelfLifeDays" bigint null,
  "Barcode" text null,
  constraint tblProduct_pkey primary key ("ProductID")
) TABLESPACE pg_default;

create table public."tblStorageZone" (
  "ZoneID" bigint generated always as identity not null,
  "ZoneName" text not null,
  "TempBand" text not null,
  "CapacityKg" bigint not null,
  "Notes" text null,
  constraint tblStorageZone_pkey primary key ("ZoneID")
) TABLESPACE pg_default;

create table public."tblZoneCapacityLog" (
  "LogID" bigint generated always as identity not null,
  "ZoneID" bigint not null,
  "LogDate" date not null,
  "UsedKg" double precision not null,
  constraint tblZoneCapacityLog_pkey primary key ("LogID"),
  constraint tblZoneCapacityLog_ZoneID_fkey foreign KEY ("ZoneID") references "tblStorageZone" ("ZoneID")
) TABLESPACE pg_default;
