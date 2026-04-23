/**
 * Example report SELECTs aligned with SCHEMA_REFERENCE.sql (quoted PascalCase columns).
 * Original files live under /example query/ — these strings are the runnable versions.
 */
export const EXAMPLE_QUERIES = [
  {
    id: "01",
    label: "01 — Inventory by product",
    sql: `SELECT
  p."ProductID",
  p."ProductName" AS product_name,
  SUM(NULLIF(TRIM(COALESCE(i."OnHandUnits"::text, '')), '')::numeric) AS total_units,
  ROUND(SUM(NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric)::numeric, 2) AS total_kg
FROM "tblInventory" i
JOIN "tblDonationLot" l ON l."LotID" = i."LotID"
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
GROUP BY p."ProductID", p."ProductName"
ORDER BY total_kg DESC NULLS LAST`,
  },
  {
    id: "02",
    label: "02 — Inventory by zone",
    sql: `SELECT
  z."ZoneID",
  z."ZoneName",
  z."TempBand",
  ROUND(SUM(NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric)::numeric, 2) AS zone_on_hand_kg
FROM "tblStorageZone" z
LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
GROUP BY z."ZoneID", z."ZoneName", z."TempBand"
ORDER BY zone_on_hand_kg DESC NULLS LAST`,
  },
  {
    id: "03",
    label: "03 — Near-expiry lots (7 days)",
    sql: `SELECT
  l."LotID",
  p."ProductName" AS product_name,
  l."ExpiryDate",
  l."QuantityUnits",
  l."Status",
  (l."ExpiryDate" - CURRENT_DATE) AS days_left
FROM "tblDonationLot" l
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
WHERE l."ExpiryDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY l."ExpiryDate" ASC`,
  },
  {
    id: "04",
    label: "04 — Expired lots",
    sql: `SELECT
  l."LotID",
  p."ProductName" AS product_name,
  l."ExpiryDate",
  l."QuantityUnits",
  l."Status"
FROM "tblDonationLot" l
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
WHERE l."ExpiryDate" < CURRENT_DATE
ORDER BY l."ExpiryDate" ASC`,
  },
  {
    id: "05",
    label: "05 — FEFO picking candidates",
    sql: `SELECT
  p."ProductID",
  p."ProductName" AS product_name,
  l."LotID",
  l."ExpiryDate",
  i."InventoryID",
  NULLIF(TRIM(COALESCE(i."OnHandUnits"::text, '')), '')::numeric AS on_hand_units,
  NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric AS on_hand_kg,
  z."ZoneName"
FROM "tblInventory" i
JOIN "tblDonationLot" l ON l."LotID" = i."LotID"
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
JOIN "tblStorageZone" z ON z."ZoneID" = i."ZoneID"
WHERE COALESCE(NULLIF(TRIM(COALESCE(i."OnHandUnits"::text, '')), '')::numeric, 0) > 0
ORDER BY p."ProductID", l."ExpiryDate" ASC, i."InventoryID"`,
  },
  {
    id: "06",
    label: "06 — Zone utilization %",
    sql: `SELECT
  z."ZoneID",
  z."ZoneName",
  z."CapacityKg",
  ROUND(COALESCE(SUM(NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric), 0)::numeric, 2) AS used_kg,
  ROUND(
    CASE
      WHEN z."CapacityKg" > 0 THEN (COALESCE(SUM(NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric), 0) / z."CapacityKg" * 100)::numeric
      ELSE 0
    END, 2
  ) AS utilization_pct
FROM "tblStorageZone" z
LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
GROUP BY z."ZoneID", z."ZoneName", z."CapacityKg"
ORDER BY utilization_pct DESC`,
  },
  {
    id: "07",
    label: "07 — Zones over capacity",
    sql: `SELECT *
FROM (
  SELECT
    z."ZoneID",
    z."ZoneName",
    z."CapacityKg",
    COALESCE(SUM(NULLIF(TRIM(COALESCE(i."OnHandKg"::text, '')), '')::numeric), 0) AS used_kg
  FROM "tblStorageZone" z
  LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
  GROUP BY z."ZoneID", z."ZoneName", z."CapacityKg"
) x
WHERE x.used_kg > x."CapacityKg"
ORDER BY x.used_kg - x."CapacityKg" DESC`,
  },
  {
    id: "08",
    label: "08 — Zone capacity trend (30 days)",
    sql: `SELECT
  z."ZoneName",
  c."LogDate",
  c."UsedKg",
  z."CapacityKg",
  ROUND((c."UsedKg" / NULLIF(z."CapacityKg", 0) * 100)::numeric, 2) AS utilization_pct
FROM "tblZoneCapacityLog" c
JOIN "tblStorageZone" z ON z."ZoneID" = c."ZoneID"
WHERE c."LogDate" >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY z."ZoneName", c."LogDate"`,
  },
  {
    id: "09",
    label: "09 — Orders by status",
    sql: `SELECT
  o."Status",
  COUNT(*) AS order_count
FROM "tblOrders" o
GROUP BY o."Status"
ORDER BY order_count DESC`,
  },
  {
    id: "10",
    label: "10 — High-priority open orders",
    sql: `SELECT
  o."OrderID",
  o."OrderDate",
  o."Status",
  o."Priority",
  b."BeneficiaryName",
  b."District"
FROM "tblOrders" o
JOIN "tblBeneficiary" b ON b."BeneficiaryID" = o."BeneficiaryID"
WHERE o."Status" NOT IN ('Completed', 'Cancelled')
ORDER BY o."Priority" DESC, o."OrderDate" ASC
LIMIT 100`,
  },
  {
    id: "11",
    label: "11 — Requested quantity by line",
    sql: `SELECT
  ol."OrderLineID",
  ol."OrderID",
  p."ProductName" AS product_name,
  ol."QtyUnits" AS requested_units
FROM "tblOrderLine" ol
JOIN "tblProduct" p ON p."ProductID" = ol."ProductID"
ORDER BY ol."OrderID", ol."OrderLineID"`,
  },
  {
    id: "12",
    label: "12 — Allocation progress by line",
    sql: `SELECT
  ol."OrderLineID",
  ol."OrderID",
  p."ProductName" AS product_name,
  ol."QtyUnits" AS requested_units,
  COALESCE(SUM(pa."AllocUnits"), 0) AS allocated_units,
  (ol."QtyUnits" - COALESCE(SUM(pa."AllocUnits"), 0)) AS remaining_units
FROM "tblOrderLine" ol
JOIN "tblProduct" p ON p."ProductID" = ol."ProductID"
LEFT JOIN "tblPickAllocation" pa ON pa."OrderLineID" = ol."OrderLineID"
GROUP BY ol."OrderLineID", ol."OrderID", p."ProductName", ol."QtyUnits"
ORDER BY remaining_units DESC, ol."OrderID"`,
  },
  {
    id: "13",
    label: "13 — Backordered lines",
    sql: `SELECT *
FROM (
  SELECT
    ol."OrderLineID",
    ol."OrderID",
    p."ProductName" AS product_name,
    ol."QtyUnits" AS requested_units,
    COALESCE(SUM(pa."AllocUnits"), 0) AS allocated_units,
    (ol."QtyUnits" - COALESCE(SUM(pa."AllocUnits"), 0)) AS remaining_units
  FROM "tblOrderLine" ol
  JOIN "tblProduct" p ON p."ProductID" = ol."ProductID"
  LEFT JOIN "tblPickAllocation" pa ON pa."OrderLineID" = ol."OrderLineID"
  GROUP BY ol."OrderLineID", ol."OrderID", p."ProductName", ol."QtyUnits"
) x
WHERE x.remaining_units > 0
ORDER BY x.remaining_units DESC`,
  },
  {
    id: "14",
    label: "14 — Pick allocation totals",
    sql: `SELECT
  COUNT(*)::bigint AS total_allocations,
  COALESCE(SUM(pa."AllocUnits"), 0)::bigint AS total_allocated_units,
  COUNT(DISTINCT pa."OrderLineID")::bigint AS distinct_order_lines
FROM "tblPickAllocation" pa`,
  },
  {
    id: "15",
    label: "15 — Donor contribution summary",
    sql: `SELECT
  d."DonorID",
  d."DonorName" AS donor_name,
  COUNT(l."LotID") AS lot_count,
  SUM(l."QuantityUnits") AS total_units,
  ROUND(SUM(l."QuantityUnits" * l."UnitWeightKg")::numeric, 2) AS est_total_kg
FROM "tblDonor" d
LEFT JOIN "tblDonationLot" l ON l."DonorID" = d."DonorID"
GROUP BY d."DonorID", d."DonorName"
ORDER BY est_total_kg DESC NULLS LAST`,
  },
  {
    id: "16",
    label: "16 — Monthly inbound donation trend",
    sql: `SELECT
  DATE_TRUNC('month', l."ReceivedDate")::date AS month_start,
  SUM(l."QuantityUnits") AS total_units,
  ROUND(SUM(l."QuantityUnits" * l."UnitWeightKg")::numeric, 2) AS est_total_kg
FROM "tblDonationLot" l
GROUP BY DATE_TRUNC('month', l."ReceivedDate")
ORDER BY month_start`,
  },
];
