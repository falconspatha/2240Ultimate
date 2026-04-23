SELECT
  DATE_TRUNC('month', l."Received_Date")::date AS month_start,
  SUM(l."Quantity_Units") AS total_units,
  ROUND(SUM(l."Quantity_Units" * l."Unit_Weight_kg")::numeric, 2) AS est_total_kg
FROM "tblDonationLot" l
GROUP BY DATE_TRUNC('month', l."Received_Date")
ORDER BY month_start;
