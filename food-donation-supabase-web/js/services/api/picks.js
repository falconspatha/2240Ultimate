import { supabase } from "../supabaseClient.js";
import { allocateOrderLineFEFO } from "./orders.js";

export async function fefoCandidates(productId) {
  const { data, error } = await supabase.rpc("fn_fefo_candidates", {
    p_product_id: Number(productId),
  });
  if (error) throw error;
  // reshape to match existing page expectations: { ...lot, inventory: { InventoryID, ZoneID, OnHandUnits, OnHandKg } }
  return (data || []).map((r) => ({
    LotID:         r.LotID,
    ProductID:     r.ProductID,
    QuantityUnits: r.QuantityUnits,
    UnitWeightKg:  r.UnitWeightKg,
    ExpiryDate:    r.ExpiryDate,
    Status:        r.Status,
    inventory: {
      InventoryID:  r.InventoryID,
      ZoneID:       r.ZoneID,
      OnHandUnits:  r.OnHandUnits,
      OnHandKg:     r.OnHandKg,
    },
  }));
}

export async function allocate({ orderLineId }) {
  return allocateOrderLineFEFO(orderLineId);
}

export async function markPicked(allocationId) {
  const { data, error } = await supabase.rpc("fn_mark_picked", {
    p_allocation_id: Number(allocationId),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function listPickAllocations(orderLineIds) {
  const { data, error } = await supabase.rpc("fn_list_pick_allocations", {
    p_order_line_ids: orderLineIds.map(Number),
  });
  if (error) throw error;
  return data || [];
}
