import { supabaseServer } from "./supabase/server";
import { normalizeRole, type AppRole } from "./roleAccess";

export async function getUser() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthenticated");
  }
  return user;
}

export function getUserRole(user: { app_metadata?: { role?: string }; user_metadata?: { role?: string } } | null) {
  const rawRole = user?.app_metadata?.role || user?.user_metadata?.role;
  return normalizeRole(rawRole);
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = getUserRole(user);
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  const role = getUserRole(user);
  if (!roles.includes(role)) {
    throw new Error("Forbidden");
  }
  return { user, role };
}
