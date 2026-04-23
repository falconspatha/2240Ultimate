import { supabase } from "../supabaseClient.js";

export async function listProducts({ search = "", page = 1, size = 10, sort = "ProductID", sortDir = "desc", filters = {} } = {}) {
  const { data, error } = await supabase.rpc("fn_list_products", {
    p_search:   search,
    p_category: filters.Category        || "",
    p_temp:     filters.TempRequirement || "",
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

export async function createProduct(payload) {
  const { data, error } = await supabase.rpc("fn_create_product", {
    p_name:             payload.ProductName,
    p_category:         payload.Category,
    p_unit_weight_kg:   Number(payload.UnitWeightKg),
    p_temp_requirement: payload.TempRequirement,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateProduct(id, patch) {
  const { data, error } = await supabase.rpc("fn_update_product", {
    p_id:               id,
    p_name:             patch.ProductName,
    p_category:         patch.Category,
    p_unit_weight_kg:   Number(patch.UnitWeightKg),
    p_temp_requirement: patch.TempRequirement,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.rpc("fn_delete_product", { p_id: id });
  if (error) throw error;
}
