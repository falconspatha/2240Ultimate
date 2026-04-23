"use server";

import { supabaseServer } from "../../../lib/supabase/server";

export async function createBeneficiary(formData: FormData) {
  const supabase = supabaseServer();
  const payload = {
    Beneficiary_Name: formData.get("name"),
    Contact_Name: formData.get("contact"),
    Phone: formData.get("phone"),
    Address: formData.get("address"),
    District: formData.get("district"),
    Has_Cold_Storage: formData.get("coldStorage") === "true",
  };
  const { error } = await supabase.from("tblBeneficiary").insert(payload);
  if (error) throw error;
}
