import { supabaseServer } from "../supabase/server";
import { supabaseService } from "../supabase/service";
import { requireAdmin, getUser } from "../auth";

export async function rpcKpiDashboard() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("fn_kpi_dashboard");
  if (error) throw error;
  return data;
}

export async function rpcSearchInventory(payload: {
  q: string;
  filters: Record<string, string | undefined>;
  page: number;
  size: number;
  sort: string;
}) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("fn_search_inventory", payload);
  if (error) throw error;
  return data;
}

export async function rpcUpsertDonationLot(payload: Record<string, unknown>) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("fn_upsert_donation_lot", payload);
  if (error) throw error;
  return data;
}

export async function rpcAllocateOrder(orderId: number) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("fn_allocate_order", { p_order_id: orderId });
  if (error) throw error;

  const user = await getUser();
  const service = supabaseService();
  await service.from("tblAdminAuditLog").insert({
    action: "allocate_order",
    actor_id: user?.id ?? null,
    details: { orderId, allocations: data?.length ?? 0 },
  });
  return data;
}

export async function rpcRecalcZoneCapacity(zoneId: number) {
  const supabase = supabaseServer();
  const { data, error } = await supabase.rpc("fn_recalc_zone_capacity", { p_zone_id: zoneId });
  if (error) throw error;
  return data;
}

export async function resetGeneratedPages() {
  const admin = await requireAdmin();
  const service = supabaseService();
  const { error } = await service.rpc("fn_reset_generated_pages");
  if (error) throw error;
  await service.from("tblAdminAuditLog").insert({
    action: "reset_generated_pages",
    actor_id: admin.id,
    details: { by: admin.email },
  });
  return true;
}

export async function executeAdminSql(sql: string) {
  const admin = await requireAdmin();
  const statement = sql.trim();
  const allowed =
    /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i.test(statement) ||
    /^CREATE\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i.test(statement) ||
    /^DROP\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s*;?$/i.test(statement);
  if (!allowed) {
    throw new Error("Only CREATE/ALTER/DROP TABLE statements are allowed.");
  }

  const service = supabaseService();
  const { error } = await service.rpc("fn_admin_run_sql", { p_sql: statement });
  if (error) throw error;

  await service.from("tblAdminAuditLog").insert({
    action: "admin_run_sql",
    actor_id: admin.id,
    details: { sql: statement },
  });
  return true;
}
