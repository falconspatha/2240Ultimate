import type { AppRole } from "./roleAccess";

type NavItem = {
  href: string;
  label: string;
  roles: AppRole[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin/workspace", label: "Admin Workspace", roles: ["admin"] },
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "inventory"] },
  { href: "/reports", label: "Reports", roles: ["admin", "inventory"] },
  { href: "/donations", label: "Donations", roles: ["admin", "inventory"] },
  { href: "/inventory", label: "Inventory", roles: ["admin", "inventory"] },
  { href: "/orders", label: "Orders", roles: ["admin", "inventory"] },
  { href: "/picking", label: "Picking", roles: ["admin", "inventory"] },
  { href: "/beneficiaries", label: "Beneficiaries", roles: ["admin"] },
  { href: "/zones", label: "Zones", roles: ["admin", "inventory"] },
  { href: "/beneficiary/register", label: "Beneficiary Register", roles: ["admin", "beneficiary"] },
  { href: "/beneficiary/order", label: "Beneficiary Order", roles: ["admin", "beneficiary"] },
  { href: "/donor/register", label: "Donor Register", roles: ["admin", "donor"] },
  { href: "/donor/donation", label: "Make Donation", roles: ["admin", "donor"] },
  { href: "/admin/reset", label: "Admin Reset", roles: ["admin"] },
];

export function navForRole(role: AppRole) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
