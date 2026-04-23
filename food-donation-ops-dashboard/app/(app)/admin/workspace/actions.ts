"use server";

import { requireAdmin } from "../../../../lib/auth";
import { supabaseService } from "../../../../lib/supabase/service";

const DDL_ALLOWLIST = [
  /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i,
  /^CREATE\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i,
  /^DROP\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s*;?$/i,
];

export async function runAdminDDL(formData: FormData) {
  const admin = await requireAdmin();
  const sql = String(formData.get("sql") || "").trim();
  if (!sql) throw new Error("SQL statement is required.");
  if (!DDL_ALLOWLIST.some((rule) => rule.test(sql))) {
    throw new Error("Only CREATE/ALTER/DROP TABLE statements are permitted.");
  }

  const service = supabaseService();
  const { error } = await service.rpc("fn_admin_run_sql", { p_sql: sql });
  if (error) throw error;

  await service.from("tblAdminAuditLog").insert({
    actor_id: admin.id,
    action: "admin_run_ddl",
    details: { sql },
  });
}
