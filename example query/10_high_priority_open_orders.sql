SELECT
  o."OrderID",
  o."Order_Date",
  o."Status",
  o."Priority",
  b."Beneficiary_Name",
  b."District"
FROM "tblOrders" o
JOIN "tblBeneficiary" b ON b."BeneficiaryID" = o."BeneficiaryID"
WHERE o."Priority" IN ('High', 'Urgent')
  AND o."Status" NOT IN ('Completed', 'Cancelled')
ORDER BY o."Order_Date" ASC;
