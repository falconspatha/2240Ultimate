SELECT
  l.LotID,
  p.name AS product_name,
  d.Name AS donor_name,
  l.Expiry_Date,
  l.Quantity_Units,
  (l.Quantity_Units * COALESCE(l.Unit_Weight_kg, 0)) AS total_kg,
  l.Status
FROM tblDonationLot l
JOIN tblProduct p ON p.ProductID = l.ProductID
LEFT JOIN tblDonor d ON d.DonorID = l.DonorID
WHERE l.Expiry_Date < CURRENT_DATE
  AND l.Status IN ('Received', 'Stored', 'Allocated', 'Picked')
ORDER BY l.Expiry_Date ASC, l.LotID ASC;
