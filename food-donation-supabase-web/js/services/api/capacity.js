import { supabase } from "../supabaseClient.js";

export async function logComputedZoneUsage(zoneId) {
  const { error } = await supabase.rpc("fn_log_computed_zone_usage", {
    p_zone_id: Number(zoneId),
  });
  if (error) throw error;
}
