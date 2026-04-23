"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabase/server";

export async function createSelfBeneficiary(formData: FormData) {
  const supabase = supabaseServer();
  const payload = {
    Beneficiary_Name: String(formData.get("name") || ""),
    Contact_Name: String(formData.get("contact") || ""),
    Phone: String(formData.get("phone") || ""),
    Address: String(formData.get("address") || ""),
    District: String(formData.get("district") || ""),
    Latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    Longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    Has_Cold_Storage: String(formData.get("coldStorage") || "false") === "true",
  };

  const { data, error } = await supabase.from("tblBeneficiary").insert(payload).select("BeneficiaryID").single();
  if (error) throw error;
  revalidatePath("/beneficiary/register");
  redirect(`/beneficiary/order?beneficiaryId=${data.BeneficiaryID}`);
}
