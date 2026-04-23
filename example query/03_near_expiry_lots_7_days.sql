SELECT
  l."LotID",
  p."name" AS product_name,
  l."Expiry_Date",
  l."Quantity_Units",
  l."Status",
  (l."Expiry_Date" - CURRENT_DATE) AS days_left
FROM "tblDonationLot" l
JOIN "tblProduct" p ON p."ProductID" = l."ProductID"
WHERE l."Expiry_Date" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY l."Expiry_Date" ASC;
