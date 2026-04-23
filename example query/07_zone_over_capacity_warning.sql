SELECT *
FROM (
  SELECT
    z."ZoneID",
    z."Zone_Name",
    z."Capacity_kg",
    COALESCE(SUM(i."On_Hand_kg"), 0) AS used_kg
  FROM "tblStorageZone" z
  LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
  GROUP BY z."ZoneID", z."Zone_Name", z."Capacity_kg"
) x
WHERE x.used_kg > x."Capacity_kg"
ORDER BY x.used_kg - x."Capacity_kg" DESC;
