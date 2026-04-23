SELECT
  z."Zone_Name",
  c."Log_Date",
  c."Used_kg",
  z."Capacity_kg",
  ROUND((c."Used_kg" / NULLIF(z."Capacity_kg", 0) * 100)::numeric, 2) AS utilization_pct
FROM "tblZoneCapacityLog" c
JOIN "tblStorageZone" z ON z."ZoneID" = c."ZoneID"
WHERE c."Log_Date" >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY z."Zone_Name", c."Log_Date";
