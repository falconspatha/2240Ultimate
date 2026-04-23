"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "../../../../lib/supabase/server";

export async function createBeneficiaryOrder(formData: FormData) {
  const beneficiaryId = Number(formData.get("beneficiaryId"));
  if (!beneficiaryId) {
    throw new Error("Beneficiary ID not found. Please register first.");
  }
  const supabase = supabaseServer();
  const payload = {
    BeneficiaryID: beneficiaryId,
    OrderDate: String(formData.get("orderDate") || new Date().toISOString().slice(0, 10)),
    RequiredDeliveryDate: String(formData.get("requiredDeliveryDate") || "") || null,
    Status: String(formData.get("status") || "Pending"),
    Priority: 1,
    Notes: String(formData.get("notes") || "") || null,
  };
  const { data: createdOrder, error } = await supabase.from("tblOrders").insert(payload).select("OrderID").single();
  if (error) throw error;

  const productId = Number(formData.get("productId"));
  const qtyUnits = Number(formData.get("qtyUnits"));
  if (!productId || !qtyUnits) {
    throw new Error("Food product and quantity are required.");
  }

  const { error: lineError } = await supabase.from("tblOrderLine").insert({
    OrderID: createdOrder.OrderID,
    ProductID: productId,
    QtyUnits: qtyUnits,
    Notes: String(formData.get("lineNotes") || "") || null,
  });
  if (lineError) throw lineError;
  revalidatePath("/beneficiary/order");
}
