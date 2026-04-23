SELECT
  o."Status",
  COUNT(*) AS order_count
FROM "tblOrders" o
GROUP BY o."Status"
ORDER BY order_count DESC;
