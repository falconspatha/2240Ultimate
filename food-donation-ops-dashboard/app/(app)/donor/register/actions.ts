"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "../../../../lib/supabase/server";

export async function createSelfDonor(formData: FormData) {
  const supabase = supabaseServer();
  const payload = {
    Name: String(formData.get("name") || ""),
    Type: String(formData.get("type") || ""),
    Phone: String(formData.get("phone") || ""),
    Address: String(formData.get("address") || ""),
    District: String(formData.get("district") || ""),
  };
  const { data, error } = await supabase.from("tblDonor").insert(payload).select("DonorID").single();
  if (error) throw error;
  revalidatePath("/donor/register");
  redirect(`/donor/donation?donorId=${data.DonorID}`);
}
