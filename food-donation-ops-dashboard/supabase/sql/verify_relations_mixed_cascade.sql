-- Verification suite for relations_mixed_cascade.sql
-- Run after applying relation migration and loading data.

-- 1) Confirm all FK constraints and delete rules.
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.table_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'tblDonationLot',
    'tblInventory',
    'tblOrders',
    'tblOrderLine',
    'tblPickAllocation',
    'tblZoneCapacityLog'
  )
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 2) Quick orphan checks (should all be 0).
select 'lot->donor' as check_name, count(*) as orphans
from public."tblDonationLot" l
left join public."tblDonor" d on d."DonorID" = l."DonorID"
where d."DonorID" is null
union all
select 'lot->product', count(*)
from public."tblDonationLot" l
left join public."tblProduct" p on p."ProductID" = l."ProductID"
where p."ProductID" is null
union all
select 'lot->storedZone', count(*)
from public."tblDonationLot" l
left join public."tblStorageZone" z on z."ZoneID" = l."StoredZoneID"
where z."ZoneID" is null
union all
select 'inventory->lot', count(*)
from public."tblInventory" i
left join public."tblDonationLot" l on l."LotID" = i."LotID"
where l."LotID" is null
union all
select 'inventory->zone', count(*)
from public."tblInventory" i
left join public."tblStorageZone" z on z."ZoneID" = i."ZoneID"
where z."ZoneID" is null
union all
select 'orders->beneficiary', count(*)
from public."tblOrders" o
left join public."tblBeneficiary" b on b."BeneficiaryID" = o."BeneficiaryID"
where b."BeneficiaryID" is null
union all
select 'orderline->order', count(*)
from public."tblOrderLine" ol
left join public."tblOrders" o on o."OrderID" = ol."OrderID"
where o."OrderID" is null
union all
select 'orderline->product', count(*)
from public."tblOrderLine" ol
left join public."tblProduct" p on p."ProductID" = ol."ProductID"
where p."ProductID" is null
union all
select 'pick->orderline', count(*)
from public."tblPickAllocation" pa
left join public."tblOrderLine" ol on ol."OrderLineID" = pa."OrderLineID"
where ol."OrderLineID" is null
union all
select 'pick->inventory', count(*)
from public."tblPickAllocation" pa
left join public."tblInventory" i on i."InventoryID" = pa."InventoryID"
where i."InventoryID" is null
union all
select 'capacityLog->zone', count(*)
from public."tblZoneCapacityLog" zl
left join public."tblStorageZone" z on z."ZoneID" = zl."ZoneID"
where z."ZoneID" is null;

-- 3) Behavioral checks (run manually one block at a time).
-- 3a) RESTRICT test (expected: fails when related children exist).
-- begin;
-- delete from public."tblDonor"
-- where "DonorID" = (select "DonorID" from public."tblDonationLot" limit 1);
-- rollback;

-- 3b) CASCADE test on orders chain (expected: matching order lines removed).
-- begin;
-- with target as (
--   select "OrderID" from public."tblOrders"
--   where exists (
--     select 1 from public."tblOrderLine" ol where ol."OrderID" = public."tblOrders"."OrderID"
--   )
--   limit 1
-- )
-- select (select count(*) from public."tblOrderLine" ol join target t on ol."OrderID" = t."OrderID") as before_orderline_count;
--
-- delete from public."tblOrders"
-- where "OrderID" = (select "OrderID" from target);
--
-- select (select count(*) from public."tblOrderLine" ol join target t on ol."OrderID" = t."OrderID") as after_orderline_count;
-- rollback;

-- 3c) CASCADE test on donation lot -> inventory -> pick allocation chain.
-- begin;
-- with target_lot as (
--   select "LotID" from public."tblInventory" limit 1
-- )
-- select
--   (select count(*) from public."tblInventory" i join target_lot t on i."LotID" = t."LotID") as before_inventory_count,
--   (select count(*) from public."tblPickAllocation" pa
--      join public."tblInventory" i on i."InventoryID" = pa."InventoryID"
--      join target_lot t on i."LotID" = t."LotID") as before_pick_count;
--
-- delete from public."tblDonationLot"
-- where "LotID" = (select "LotID" from target_lot);
--
-- select
--   (select count(*) from public."tblInventory" i join target_lot t on i."LotID" = t."LotID") as after_inventory_count,
--   (select count(*) from public."tblPickAllocation" pa
--      join public."tblInventory" i on i."InventoryID" = pa."InventoryID"
--      join target_lot t on i."LotID" = t."LotID") as after_pick_count;
-- rollback;
