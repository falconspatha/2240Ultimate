"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rpcUpsertDonationLot } from "../../../../lib/services/rpc";

export async function createDonorLot(formData: FormData) {
  const donorId = Number(formData.get("donorId"));
  if (!donorId) {
    throw new Error("Donor ID not found. Please register first.");
  }
  const payload = {
    p_donor_id: donorId,
    p_product_id: Number(formData.get("productId")),
    p_qty_units: Number(formData.get("quantityUnits")),
    p_unit_weight_kg: Number(formData.get("unitWeightKg")),
    p_expiry: formData.get("expiryDate"),
    p_zone_id: Number(formData.get("zoneId")),
    p_temp_req: formData.get("tempRequirement"),
    p_notes: formData.get("notes"),
  };
  const result = await rpcUpsertDonationLot(payload);
  revalidatePath("/donor/donation");

  const lotId = typeof result === "number" ? result : Number(result || 0);
  const params = new URLSearchParams({
    donorId: String(donorId),
    lotId: lotId ? String(lotId) : "",
    productId: String(payload.p_product_id),
    qtyUnits: String(payload.p_qty_units),
    unitWeightKg: String(payload.p_unit_weight_kg),
    expiryDate: String(payload.p_expiry || ""),
  });
  redirect(`/donor/donation/thank-you?${params.toString()}`);
}
