SELECT
  p."ProductID",
  p."name" AS product_name,
  SUM(i."On_Hand_Units") AS total_units,
  ROUND(SUM(i."On_Hand_kg")::numeric, 2) AS total_kg
FROM "tblInventory" i
JOIN "tblDonationLot" l ON l."LotID" = i."LotID"
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
GROUP BY p."ProductID", p."name"
ORDER BY total_kg DESC;
