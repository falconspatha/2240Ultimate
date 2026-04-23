SELECT
  ol."OrderLineID",
  ol."OrderID",
  p."name" AS product_name,
  ol."Qty_Units" AS requested_units
FROM "tblOrderLine" ol
JOIN "tblProduct" p ON p."ProductID" = ol."ProductID"
ORDER BY ol."OrderID", ol."OrderLineID";
