import { supabase } from "../supabaseClient.js";

export async function listZones({ search = "", sort = "ZoneName", sortDir = "asc" } = {}) {
  const { data, error } = await supabase.rpc("fn_list_zones", {
    p_search:   search,
    p_sort:     sort,
    p_sort_dir: sortDir,
  });
  if (error) throw error;
  return data || [];
}

export async function createZone(payload) {
  const { data, error } = await supabase.rpc("fn_create_zone", {
    p_name:        payload.ZoneName,
    p_temp_band:   payload.TempBand,
    p_capacity_kg: Number(payload.CapacityKg),
    p_notes:       payload.Notes || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateZone(id, patch) {
  const { data, error } = await supabase.rpc("fn_update_zone", {
    p_id:          id,
    p_name:        patch.ZoneName,
    p_temp_band:   patch.TempBand,
    p_capacity_kg: Number(patch.CapacityKg),
    p_notes:       patch.Notes || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteZone(id) {
  const { error } = await supabase.rpc("fn_delete_zone", { p_id: id });
  if (error) throw error;
}
