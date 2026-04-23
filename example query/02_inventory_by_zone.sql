SELECT
  z."ZoneID",
  z."Zone_Name",
  z."Temp_Band",
  ROUND(SUM(i."On_Hand_kg")::numeric, 2) AS zone_on_hand_kg
FROM "tblStorageZone" z
LEFT JOIN "tblInventory" i ON i."ZoneID" = z."ZoneID"
GROUP BY z."ZoneID", z."Zone_Name", z."Temp_Band"
ORDER BY zone_on_hand_kg DESC NULLS LAST;
