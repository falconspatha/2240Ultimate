SELECT
  COUNT(*) AS total_allocations,
  SUM(CASE WHEN pa."Picked" THEN 1 ELSE 0 END) AS picked_count,
  ROUND(
    (SUM(CASE WHEN pa."Picked" THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS picked_rate_pct
FROM "tblPickAllocation" pa;
