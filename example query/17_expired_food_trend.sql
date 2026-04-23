SELECT
  l.Expiry_Date,
  COUNT(*) AS expired_lot_count,
  SUM(l.Quantity_Units) AS expired_units,
  ROUND(SUM(l.Quantity_Units * COALESCE(l.Unit_Weight_kg, 0))::numeric, 2) AS expired_kg
FROM tblDonationLot l
WHERE l.Expiry_Date < CURRENT_DATE
  AND l.Status IN ('Received', 'Stored', 'Allocated', 'Picked')
GROUP BY l.Expiry_Date
ORDER BY l.Expiry_Date ASC;
