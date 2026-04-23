SELECT
  z."ZoneID",
  z."Zone_Name",
  z."Capacity_kg",
  ROUND(COALESCE(SUM(i."On_Hand_kg"), 0)::numeric, 2) AS used_kg,
  ROUND(
    CASE
      WHEN z."Capacity_kg" > 0 THEN (COALESCE(SUM(i."On_Hand_kg"), 0) / z."Capacity_kg" * 100)::numeric
      ELSE 0
    END, 2
  ) AS utilization_pct
FROM "tblStorageZone" z
LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
GROUP BY z."ZoneID", z."Zone_Name", z."Capacity_kg"
ORDER BY utilization_pct DESC;
