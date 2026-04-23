-- Enable RLS
ALTER TABLE tblUserPage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblDonationLot ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblInventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblOrders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblOrderLine ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblPickAllocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblBeneficiary ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblStorageZone ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblDonor ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblProduct ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblZoneCapacityLog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tblAdminAuditLog ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotent re-runs
DO $$
DECLARE
  t text;
  p text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'tblUserPage','tblDonationLot','tblInventory','tblOrders','tblOrderLine','tblPickAllocation',
    'tblBeneficiary','tblStorageZone','tblDonor','tblProduct','tblZoneCapacityLog','tblAdminAuditLog'
  )
  LOOP
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- User pages
CREATE POLICY "userpage_owner_select"
ON tblUserPage FOR SELECT
USING (auth.uid() = UserID OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "userpage_owner_insert"
ON tblUserPage FOR INSERT
WITH CHECK (auth.uid() = UserID OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "userpage_owner_update"
ON tblUserPage FOR UPDATE
USING (auth.uid() = UserID OR auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.uid() = UserID OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "userpage_admin_delete"
ON tblUserPage FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Core reference tables: admin + inventory can read
CREATE POLICY "product_staff_select"
ON tblProduct FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "product_admin_write"
ON tblProduct FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "product_admin_update"
ON tblProduct FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "product_admin_delete"
ON tblProduct FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "zone_staff_select"
ON tblStorageZone FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory', 'donor'));

CREATE POLICY "zone_staff_write"
ON tblStorageZone FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "zone_staff_update"
ON tblStorageZone FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "zone_admin_delete"
ON tblStorageZone FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Donors: donor can self-register (insert only), admin/inventory can manage
CREATE POLICY "donor_staff_select"
ON tblDonor FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory', 'donor'));

CREATE POLICY "donor_insert"
ON tblDonor FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'donor'));

CREATE POLICY "donor_admin_inventory_update"
ON tblDonor FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "donor_admin_delete"
ON tblDonor FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Donation lots: donor can create, staff can read/update
CREATE POLICY "lot_select"
ON tblDonationLot FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory', 'donor'));

CREATE POLICY "lot_insert"
ON tblDonationLot FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory', 'donor'));

CREATE POLICY "lot_update_staff"
ON tblDonationLot FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "lot_admin_delete"
ON tblDonationLot FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Inventory and picking: admin + inventory only
CREATE POLICY "inventory_staff_select"
ON tblInventory FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "inventory_staff_insert"
ON tblInventory FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "inventory_staff_update"
ON tblInventory FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "inventory_admin_delete"
ON tblInventory FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "pick_staff_select"
ON tblPickAllocation FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "pick_staff_insert"
ON tblPickAllocation FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "pick_staff_update"
ON tblPickAllocation FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "pick_admin_delete"
ON tblPickAllocation FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Beneficiary records: beneficiary can register only; no list access
CREATE POLICY "beneficiary_staff_select"
ON tblBeneficiary FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "beneficiary_insert"
ON tblBeneficiary FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'beneficiary'));

CREATE POLICY "beneficiary_staff_update"
ON tblBeneficiary FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "beneficiary_admin_delete"
ON tblBeneficiary FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Orders and order lines: beneficiary can insert orders, staff can manage
CREATE POLICY "orders_staff_select"
ON tblOrders FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "orders_insert"
ON tblOrders FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory', 'beneficiary'));

CREATE POLICY "orders_staff_update"
ON tblOrders FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "orders_admin_delete"
ON tblOrders FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "orderline_staff_select"
ON tblOrderLine FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "orderline_insert"
ON tblOrderLine FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "orderline_staff_update"
ON tblOrderLine FOR UPDATE
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'))
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "orderline_admin_delete"
ON tblOrderLine FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- Zone capacity log and audit
CREATE POLICY "zonecap_staff_select"
ON tblZoneCapacityLog FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "zonecap_staff_insert"
ON tblZoneCapacityLog FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'inventory'));

CREATE POLICY "zonecap_admin_delete"
ON tblZoneCapacityLog FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "audit_admin_select"
ON tblAdminAuditLog FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "audit_admin_insert"
ON tblAdminAuditLog FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');
