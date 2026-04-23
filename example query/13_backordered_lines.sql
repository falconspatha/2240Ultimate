SELECT *
FROM (
  SELECT
    ol."OrderLineID",
    ol."OrderID",
    p."name" AS product_name,
    ol."Qty_Units" AS requested_units,
    COALESCE(SUM(pa."Alloc_Units"), 0) AS allocated_units,
    (ol."Qty_Units" - COALESCE(SUM(pa."Alloc_Units"), 0)) AS remaining_units
  FROM "tblOrderLine" ol
  JOIN "tblProduct" p ON p."ProductID" = ol."ProductID"
  LEFT JOIN "tblPickAllocation" pa ON pa."OrderLineID" = ol."OrderLineID"
  GROUP BY ol."OrderLineID", ol."OrderID", p."name", ol."Qty_Units"
) x
WHERE x.remaining_units > 0
ORDER BY x.remaining_units DESC;
