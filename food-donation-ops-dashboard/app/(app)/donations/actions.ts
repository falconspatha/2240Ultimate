"use server";

import { rpcUpsertDonationLot } from "../../../lib/services/rpc";

export async function createDonationLot(formData: FormData) {
  const payload = {
    p_donor_id: Number(formData.get("donorId")),
    p_product_id: Number(formData.get("productId")),
    p_qty_units: Number(formData.get("quantityUnits")),
    p_unit_weight_kg: Number(formData.get("unitWeightKg")),
    p_expiry: formData.get("expiryDate"),
    p_zone_id: Number(formData.get("zoneId")),
    p_temp_req: formData.get("tempRequirement"),
    p_notes: formData.get("notes"),
  };
  await rpcUpsertDonationLot(payload);
}
