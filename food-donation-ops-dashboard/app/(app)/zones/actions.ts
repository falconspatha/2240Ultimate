"use server";

import { supabaseServer } from "../../../lib/supabase/server";
import { rpcRecalcZoneCapacity } from "../../../lib/services/rpc";

export async function createZone(formData: FormData) {
  const supabase = supabaseServer();
  const payload = {
    Zone_Name: formData.get("name"),
    Temp_Band: formData.get("tempBand"),
    Capacity_kg: Number(formData.get("capacityKg")),
    Notes: formData.get("notes"),
  };
  const { error } = await supabase.from("tblStorageZone").insert(payload);
  if (error) throw error;
}

export async function recalcZone(formData: FormData) {
  const zoneId = Number(formData.get("zoneId"));
  await rpcRecalcZoneCapacity(zoneId);
}
