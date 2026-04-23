import { supabase } from "../supabaseClient.js";

export async function listBeneficiaries({ search = "", page = 1, size = 10, sort = "CreatedAt", sortDir = "desc", filters = {} } = {}) {
  const coldVal = filters.HasColdStorage != null ? String(filters.HasColdStorage) : "";
  const { data, error } = await supabase.rpc("fn_list_beneficiaries", {
    p_search:       search,
    p_district:     filters.District || "",
    p_cold_storage: coldVal,
    p_sort:         sort,
    p_sort_dir:     sortDir,
    p_limit:        size,
    p_offset:       (page - 1) * size,
  });
  if (error) throw error;
  const rows = data || [];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { rows, total };
}

export async function createBeneficiary(payload) {
  const { data, error } = await supabase.rpc("fn_create_beneficiary", {
    p_name:         payload.BeneficiaryName,
    p_contact:      payload.ContactName,
    p_phone:        payload.Phone,
    p_address:      payload.Address      || null,
    p_district:     payload.District     || null,
    p_latitude:     payload.Latitude     ? Number(payload.Latitude)  : null,
    p_longitude:    payload.Longitude    ? Number(payload.Longitude) : null,
    p_cold_storage: Boolean(payload.HasColdStorage),
    p_created_at: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateBeneficiary(id, patch) {
  const { data, error } = await supabase.rpc("fn_update_beneficiary", {
    p_id:           id,
    p_name:         patch.BeneficiaryName,
    p_contact:      patch.ContactName,
    p_phone:        patch.Phone,
    p_address:      patch.Address   || null,
    p_district:     patch.District  || null,
    p_latitude:     patch.Latitude  ? Number(patch.Latitude)  : null,
    p_longitude:    patch.Longitude ? Number(patch.Longitude) : null,
    p_cold_storage: Boolean(patch.HasColdStorage),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteBeneficiary(id) {
  const { error } = await supabase.rpc("fn_delete_beneficiary", { p_id: id });
  if (error) throw error;
}
