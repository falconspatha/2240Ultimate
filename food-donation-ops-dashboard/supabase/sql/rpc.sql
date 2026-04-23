CREATE OR REPLACE FUNCTION fn_reset_generated_pages()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM tblUserPage;

  INSERT INTO tblUserPage(UserID, Path, Title)
  SELECT id, '/dashboard', 'Dashboard' FROM auth.users;

  INSERT INTO tblUserPage(UserID, Path, Title)
  SELECT id, '/inventory', 'Inventory' FROM auth.users;

  INSERT INTO tblUserPage(UserID, Path, Title)
  SELECT id, '/orders', 'Orders' FROM auth.users;

  INSERT INTO tblUserPage(UserID, Path, Title)
  SELECT id, '/reports', 'Reports' FROM auth.users;
END;
$$;

CREATE OR REPLACE FUNCTION fn_recalc_zone_capacity(p_zone_id INT)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  v_used DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(On_Hand_kg),0) INTO v_used
  FROM tblInventory WHERE ZoneID = p_zone_id;

  INSERT INTO tblZoneCapacityLog(ZoneID, Used_kg) VALUES (p_zone_id, v_used);
  RETURN v_used;
END;
$$;

CREATE OR REPLACE FUNCTION fn_upsert_donation_lot(
  p_donor_id INT,
  p_product_id INT,
  p_qty_units INT,
  p_unit_weight_kg DECIMAL,
  p_expiry DATE,
  p_zone_id INT,
  p_temp_req VARCHAR,
  p_notes TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_lot_id INT;
BEGIN
  INSERT INTO tblDonationLot(
    DonorID, ProductID, Quantity_Units, Unit_Weight_kg,
    Expiry_Date, Temp_Requirement, StoredZoneID, Notes
  ) VALUES (
    p_donor_id, p_product_id, p_qty_units, p_unit_weight_kg,
    p_expiry, p_temp_req, p_zone_id, p_notes
  ) RETURNING LotID INTO v_lot_id;

  INSERT INTO tblInventory(LotID, ZoneID, On_Hand_Units, On_Hand_kg)
  VALUES (v_lot_id, p_zone_id, p_qty_units, p_qty_units * COALESCE(p_unit_weight_kg, 0));

  PERFORM fn_recalc_zone_capacity(p_zone_id);

  RETURN v_lot_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_allocate_order(p_order_id INT)
RETURNS TABLE(
  allocation_id INT,
  orderline_id INT,
  inventory_id INT,
  alloc_units INT,
  alloc_kg DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  r_line RECORD;
  r_inv RECORD;
  remain INT;
  take_units INT;
BEGIN
  FOR r_line IN
    SELECT ol.OrderLineID, ol.ProductID, ol.Qty_Units
    FROM tblOrderLine ol
    WHERE ol.OrderID = p_order_id
  LOOP
    remain := r_line.Qty_Units;

    FOR r_inv IN
      SELECT i.InventoryID, i.On_Hand_Units, i.On_Hand_kg, l.Unit_Weight_kg, l.Expiry_Date
      FROM tblInventory i
      JOIN tblDonationLot l ON l.LotID = i.LotID
      WHERE l.ProductID = r_line.ProductID
        AND i.On_Hand_Units > 0
      ORDER BY l.Expiry_Date NULLS LAST, i.InventoryID
    LOOP
      EXIT WHEN remain <= 0;
      take_units := LEAST(remain, r_inv.On_Hand_Units);

      INSERT INTO tblPickAllocation(OrderLineID, InventoryID, Alloc_Units, Alloc_kg, Picked)
      VALUES (r_line.OrderLineID, r_inv.InventoryID, take_units, take_units * COALESCE(r_inv.Unit_Weight_kg, 0), FALSE)
      RETURNING AllocationID INTO allocation_id;

      UPDATE tblInventory
      SET On_Hand_Units = On_Hand_Units - take_units,
          On_Hand_kg = GREATEST(0, On_Hand_kg - (take_units * COALESCE(r_inv.Unit_Weight_kg, 0))),
          Last_Updated = NOW()
      WHERE InventoryID = r_inv.InventoryID;

      remain := remain - take_units;
      orderline_id := r_line.OrderLineID;
      inventory_id := r_inv.InventoryID;
      alloc_units := take_units;
      alloc_kg := take_units * COALESCE(r_inv.Unit_Weight_kg, 0);
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_kpi_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_kg DECIMAL;
  v_total_units INT;
  v_expiring INT;
  v_pending INT;
  v_zone_usage JSONB;
BEGIN
  SELECT COALESCE(SUM(On_Hand_kg),0), COALESCE(SUM(On_Hand_Units),0)
  INTO v_total_kg, v_total_units
  FROM tblInventory;

  SELECT COUNT(*) INTO v_expiring
  FROM tblDonationLot
  WHERE Expiry_Date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

  SELECT COUNT(*) INTO v_pending FROM tblOrders WHERE Status = 'Pending';

  SELECT jsonb_agg(jsonb_build_object(
    'zone_id', z.ZoneID,
    'zone_name', z.Zone_Name,
    'capacity_kg', z.Capacity_kg,
    'used_kg', COALESCE(SUM(i.On_Hand_kg),0)
  )) INTO v_zone_usage
  FROM tblStorageZone z
  LEFT JOIN tblInventory i ON i.ZoneID = z.ZoneID
  GROUP BY z.ZoneID;

  RETURN jsonb_build_object(
    'total_on_hand_kg', v_total_kg,
    'total_on_hand_units', v_total_units,
    'expiring_within_7d', v_expiring,
    'pending_orders', v_pending,
    'zones_usage', COALESCE(v_zone_usage, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_admin_run_sql(p_sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.jwt() ->> 'role' <> 'admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_sql !~* '^ALTER\\s+TABLE\\s+[A-Za-z_][A-Za-z0-9_]*\\s+' AND
     p_sql !~* '^CREATE\\s+TABLE\\s+[A-Za-z_][A-Za-z0-9_]*\\s+' AND
     p_sql !~* '^DROP\\s+TABLE\\s+[A-Za-z_][A-Za-z0-9_]*\\s*;?$' THEN
    RAISE EXCEPTION 'unsupported statement';
  END IF;

  EXECUTE p_sql;
END;
$$;

CREATE OR REPLACE FUNCTION fn_search_inventory(
  q TEXT,
  filters JSONB,
  page INT,
  size INT,
  sort TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INT := GREATEST(page - 1, 0) * size;
  v_total INT;
  v_items JSONB;
BEGIN
  WITH base AS (
    SELECT
      i.InventoryID AS inventory_id,
      i.On_Hand_Units AS on_hand_units,
      i.On_Hand_kg AS on_hand_kg,
      i.Last_Updated AS last_updated,
      l.LotID AS lot_id,
      l.Expiry_Date AS expiry_date,
      p.ProductID AS product_id,
      p.name AS product_name,
      p.Category AS category,
      z.ZoneID AS zone_id,
      z.Zone_Name AS zone_name
    FROM tblInventory i
    JOIN tblDonationLot l ON l.LotID = i.LotID
    JOIN tblProduct p ON p.ProductID = l.ProductID
    JOIN tblStorageZone z ON z.ZoneID = i.ZoneID
    WHERE (q IS NULL OR q = '' OR p.name ILIKE '%' || q || '%' OR z.Zone_Name ILIKE '%' || q || '%')
      AND ((filters ->> 'zone') IS NULL OR (filters ->> 'zone') = '' OR z.ZoneID::text = (filters ->> 'zone'))
      AND ((filters ->> 'category') IS NULL OR (filters ->> 'category') = '' OR p.Category = (filters ->> 'category'))
      AND ((filters ->> 'expiryBefore') IS NULL OR (filters ->> 'expiryBefore') = '' OR l.Expiry_Date <= (filters ->> 'expiryBefore')::date)
  ),
  ordered AS (
    SELECT * FROM base
    ORDER BY
      CASE WHEN sort = 'zone' THEN zone_name END ASC,
      CASE WHEN sort = 'kg' THEN on_hand_kg END DESC,
      CASE WHEN sort = 'expiry' OR sort IS NULL THEN expiry_date END ASC
    OFFSET v_offset LIMIT size
  )
  SELECT COUNT(*) INTO v_total FROM base;

  SELECT jsonb_agg(to_jsonb(ordered)) INTO v_items FROM ordered;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', COALESCE(v_total, 0)
  );
END;
$$;
