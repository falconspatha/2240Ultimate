export type AppRole = "admin" | "inventory" | "beneficiary" | "donor";

type RoleConfig = {
  home: string;
  allowedPaths: string[];
};

const ROLE_ACCESS: Record<AppRole, RoleConfig> = {
  admin: {
    home: "/admin/workspace",
    allowedPaths: [
      "/dashboard",
      "/reports",
      "/donations",
      "/inventory",
      "/orders",
      "/picking",
      "/beneficiaries",
      "/zones",
      "/admin/reset",
      "/admin/workspace",
      "/beneficiary/register",
      "/beneficiary/order",
      "/donor/register",
      "/donor/donation",
    ],
  },
  inventory: {
    home: "/inventory",
    allowedPaths: ["/dashboard", "/reports", "/donations", "/inventory", "/orders", "/picking", "/zones"],
  },
  beneficiary: {
    home: "/beneficiary/register",
    allowedPaths: ["/beneficiary/register", "/beneficiary/order"],
  },
  donor: {
    home: "/donor/register",
    allowedPaths: ["/donor/register", "/donor/donation"],
  },
};

const ROLE_ALIASES: Record<string, AppRole> = {
  admin: "admin",
  "administration staff": "admin",
  administration: "admin",
  inventory: "inventory",
  "inventory staff": "inventory",
  beneficiary: "beneficiary",
  beneficiaries: "beneficiary",
  donor: "donor",
  donors: "donor",
};

function canonical(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function normalizeRole(rawRole: string | null | undefined): AppRole {
  const key = String(rawRole || "").trim().toLowerCase();
  return ROLE_ALIASES[key] || "donor";
}

export function getRoleHome(role: AppRole): string {
  return ROLE_ACCESS[role].home;
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  const current = canonical(pathname);
  if (current === "/") return true;
  return ROLE_ACCESS[role].allowedPaths.some((allowed) => {
    const rule = canonical(allowed);
    return current === rule || current.startsWith(`${rule}/`);
  });
}

export function getRoleAllowedPaths(role: AppRole): string[] {
  return ROLE_ACCESS[role].allowedPaths;
}
