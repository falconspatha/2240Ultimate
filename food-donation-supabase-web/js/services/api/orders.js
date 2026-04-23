import { supabase } from "../supabaseClient.js";

export async function listOrders({ search = "", filters = {}, sort = "OrderDate", sortDir = "desc" } = {}) {
  const { data, error } = await supabase.rpc("fn_list_orders", {
    p_search:   search,
    p_status:   filters.Status || "",
    p_sort:     sort,
    p_sort_dir: sortDir,
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r,
    tblBeneficiary: { BeneficiaryName: r.BeneficiaryName },
  }));
}

export async function listOpenOrders() {
  const { data, error } = await supabase.rpc("fn_list_open_orders");
  if (error) throw error;
  return data || [];
}

export async function createOrder(header) {
  const { data, error } = await supabase.rpc("fn_create_order", {
    p_beneficiary_id:         Number(header.BeneficiaryID),
    p_order_date:             header.OrderDate || new Date().toISOString().slice(0, 10),
    p_required_delivery_date: header.RequiredDeliveryDate || null,
    p_status:                 header.Status   || "Pending",
    p_priority:               Number(header.Priority) || 1,
    p_notes:                  header.Notes    || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function cancelOrder(id) {
  const { data, error } = await supabase.rpc("fn_cancel_order", { p_id: Number(id) });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function listOrderLines(orderId) {
  const { data, error } = await supabase.rpc("fn_list_order_lines", {
    p_order_id: Number(orderId),
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r,
    tblProduct: { ProductName: r.ProductName },
  }));
}

export async function addOrderLine(orderId, line) {
  const { data, error } = await supabase.rpc("fn_add_order_line", {
    p_order_id:   Number(orderId),
    p_product_id: Number(line.ProductID),
    p_qty_units:  Number(line.QtyUnits),
    p_notes:      line.Notes || null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  // trigger FEFO allocation
  await allocateOrderLineFEFO(row.OrderLineID);
  return row;
}

export async function allocateOrderLineFEFO(orderLineId) {
  const { data, error } = await supabase.rpc("fn_allocate_fefo", {
    p_order_line_id: Number(orderLineId),
  });
  if (error) throw error;
  return data;
}
