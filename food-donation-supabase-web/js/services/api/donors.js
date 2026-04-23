import { supabase } from "../supabaseClient.js";

export async function listDonors({ search = "", page = 1, size = 10, sort = "CreatedAt", sortDir = "desc", filters = {} } = {}) {
  const { data, error } = await supabase.rpc("fn_list_donors", {
    p_search:   search,
    p_type:     filters.DonorType  || "",
    p_district: filters.District   || "",
    p_sort:     sort,
    p_sort_dir: sortDir,
    p_limit:    size,
    p_offset:   (page - 1) * size,
  });
  if (error) throw error;
  const rows = data || [];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { rows, total };
}

export async function createDonor(payload) {
  const { data, error } = await supabase.rpc("fn_create_donor", {
    p_name:       payload.DonorName,
    p_type:       payload.DonorType,
    p_phone:      payload.Phone,
    p_email:      payload.Email,
    p_address:    payload.Address,
    p_district:   payload.District,
    p_created_at: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateDonor(id, patch) {
  const { data, error } = await supabase.rpc("fn_update_donor", {
    p_id:       id,
    p_name:     patch.DonorName,
    p_type:     patch.DonorType,
    p_phone:    patch.Phone,
    p_email:    patch.Email,
    p_address:  patch.Address,
    p_district: patch.District,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteDonor(id) {
  const { error } = await supabase.rpc("fn_delete_donor", { p_id: id });
  if (error) throw error;
}

export async function donorStats(id) {
  const { data, error } = await supabase.rpc("fn_donor_stats", { p_id: id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { totalUnits: Number(row?.total_units || 0), totalKg: Number(row?.total_kg || 0) };
}
