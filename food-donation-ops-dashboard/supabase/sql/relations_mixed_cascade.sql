-- Canonical relation migration based on SCHEMA_REFERENCE.sql
-- Policy: cascading only on transactional chains, master tables protected.
-- Master tables: tblDonor, tblBeneficiary, tblProduct, tblStorageZone.

begin;

-- Drop existing FK constraints (idempotent).
alter table if exists public."tblDonationLot"
  drop constraint if exists fk_lot_donor,
  drop constraint if exists fk_lot_product,
  drop constraint if exists "tblDonationLot_StoredZoneID_fkey";

alter table if exists public."tblInventory"
  drop constraint if exists "tblInventory_LotID_fkey",
  drop constraint if exists "tblInventory_ZoneID_fkey";

alter table if exists public."tblOrders"
  drop constraint if exists fk_orders_beneficiary;

alter table if exists public."tblOrderLine"
  drop constraint if exists fk_orderline_order,
  drop constraint if exists fk_orderline_product;

alter table if exists public."tblPickAllocation"
  drop constraint if exists fk_pick_inventory,
  drop constraint if exists fk_pick_orderline;

alter table if exists public."tblZoneCapacityLog"
  drop constraint if exists "tblZoneCapacityLog_ZoneID_fkey";

-- Rebuild FK graph with mixed cascade policy.
-- Master-parent protected (no cascade from master deletes).
alter table public."tblDonationLot"
  add constraint fk_lot_donor
    foreign key ("DonorID")
    references public."tblDonor" ("DonorID")
    on delete restrict;

alter table public."tblDonationLot"
  add constraint fk_lot_product
    foreign key ("ProductID")
    references public."tblProduct" ("ProductID")
    on delete restrict;

-- Add missing practical relation for StoredZoneID.
alter table public."tblDonationLot"
  add constraint "tblDonationLot_StoredZoneID_fkey"
    foreign key ("StoredZoneID")
    references public."tblStorageZone" ("ZoneID")
    on delete restrict;

alter table public."tblOrders"
  add constraint fk_orders_beneficiary
    foreign key ("BeneficiaryID")
    references public."tblBeneficiary" ("BeneficiaryID")
    on delete restrict;

alter table public."tblOrderLine"
  add constraint fk_orderline_product
    foreign key ("ProductID")
    references public."tblProduct" ("ProductID")
    on delete restrict;

alter table public."tblInventory"
  add constraint "tblInventory_ZoneID_fkey"
    foreign key ("ZoneID")
    references public."tblStorageZone" ("ZoneID")
    on delete restrict;

alter table public."tblZoneCapacityLog"
  add constraint "tblZoneCapacityLog_ZoneID_fkey"
    foreign key ("ZoneID")
    references public."tblStorageZone" ("ZoneID")
    on delete restrict;

-- Transaction chains cascading.
alter table public."tblInventory"
  add constraint "tblInventory_LotID_fkey"
    foreign key ("LotID")
    references public."tblDonationLot" ("LotID")
    on delete cascade;

alter table public."tblOrderLine"
  add constraint fk_orderline_order
    foreign key ("OrderID")
    references public."tblOrders" ("OrderID")
    on delete cascade;

alter table public."tblPickAllocation"
  add constraint fk_pick_orderline
    foreign key ("OrderLineID")
    references public."tblOrderLine" ("OrderLineID")
    on delete cascade;

alter table public."tblPickAllocation"
  add constraint fk_pick_inventory
    foreign key ("InventoryID")
    references public."tblInventory" ("InventoryID")
    on delete cascade;

commit;
