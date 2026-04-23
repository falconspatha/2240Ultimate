SELECT
  d."DonorID",
  d."Name" AS donor_name,
  COUNT(l."LotID") AS lot_count,
  SUM(l."Quantity_Units") AS total_units,
  ROUND(SUM(l."Quantity_Units" * l."Unit_Weight_kg")::numeric, 2) AS est_total_kg
FROM "tblDonor" d
LEFT JOIN "tblDonationLot" l ON l."DonorID" = d."DonorID"
GROUP BY d."DonorID", d."Name"
ORDER BY est_total_kg DESC NULLS LAST;
