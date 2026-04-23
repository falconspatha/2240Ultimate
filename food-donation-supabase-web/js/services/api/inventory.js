import { supabase } from "../supabaseClient.js";

export async function listInventory({ search = "", zoneId, lotId, page = 1, size = 10 } = {}) {
  const { data, error } = await supabase.rpc("fn_list_inventory", {
    p_search:  search,
    p_zone_id: zoneId  ? Number(zoneId)  : 0,
    p_lot_id:  lotId   ? Number(lotId)   : 0,
    p_limit:   size,
    p_offset:  (page - 1) * size,
  });
  if (error) throw error;
  const rows = (data || []).map((r) => ({
    ...r,
    tblStorageZone: { ZoneName: r.ZoneName, TempBand: r.TempBand },
  }));
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { rows, total };
}

export async function adjustInventory({ inventoryId, deltaUnits }) {
  const { data, error } = await supabase.rpc("fn_adjust_inventory", {
    p_inventory_id: Number(inventoryId),
    p_delta_units:  Number(deltaUnits),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
