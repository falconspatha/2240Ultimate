"use server";

import { supabaseServer } from "../../../lib/supabase/server";
import { rpcAllocateOrder } from "../../../lib/services/rpc";

export async function allocateOrder(formData: FormData) {
  const orderId = Number(formData.get("orderId"));
  await rpcAllocateOrder(orderId);
  console.log("Allocated order via FIFO", { orderId });
}

export async function markPicked(formData: FormData) {
  const allocationId = Number(formData.get("allocationId"));
  const supabase = supabaseServer();
  const { error } = await supabase.from("tblPickAllocation").update({ Picked: true }).eq("AllocationID", allocationId);
  if (error) throw error;
}
