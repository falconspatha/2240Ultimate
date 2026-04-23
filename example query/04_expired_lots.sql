SELECT
  l."LotID",
  p."name" AS product_name,
  l."Expiry_Date",
  l."Quantity_Units",
  l."Status"
FROM "tblDonationLot" l
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
WHERE l."Expiry_Date" < CURRENT_DATE
ORDER BY l."Expiry_Date" ASC;
