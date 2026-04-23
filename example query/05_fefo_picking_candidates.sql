SELECT
  p."ProductID",
  p."name" AS product_name,
  l."LotID",
  l."Expiry_Date",
  i."InventoryID",
  i."On_Hand_Units",
  i."On_Hand_kg",
  z."Zone_Name"
FROM "tblInventory" i
JOIN "tblDonationLot" l ON l."LotID" = i."LotID"
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
JOIN "tblStorageZone" z ON z."ZoneID" = i."ZoneID"
WHERE i."On_Hand_Units" > 0
ORDER BY p."ProductID", l."Expiry_Date" ASC, i."On_Hand_Units" DESC;
