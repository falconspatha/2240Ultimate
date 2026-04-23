"use server";

import { revalidatePath } from "next/cache";
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
  await rpcUpsertDonationLot(payload);
  revalidatePath("/donor/donation");
}
