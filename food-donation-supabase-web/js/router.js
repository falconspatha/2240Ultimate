import { STRINGS } from "./ui/strings.js";
import { getSession } from "./auth/session.js";
import { canAccessRoute, getRoleHome } from "./auth/authorization.js";

const routes = {
  login: () => import("./pages/login.js"),
  "admin-landing": () => import("./pages/admin-landing.js"),
  "inventory-landing": () => import("./pages/inventory-landing.js"),
  "beneficiary-landing": () => import("./pages/beneficiary-landing.js"),
  "donor-landing": () => import("./pages/donor-landing.js"),
  "admin-workspace": () => import("./pages/admin-workspace.js"),
  "inventory-staff-ui": () => import("./pages/inventory-staff-ui.js"),
  dashboard: () => import("./pages/dashboard.js"),
  donors: () => import("./pages/donors.js"),
  products: () => import("./pages/products.js"),
  lots: () => import("./pages/lots.js"),
  zones: () => import("./pages/zones.js"),
  inventory: () => import("./pages/inventory.js"),
  storage: () => import("./pages/storage.js"),
  beneficiaries: () => import("./pages/beneficiaries.js"),
  orders: () => import("./pages/orders.js"),
  picking: () => import("./pages/picking.js"),
  "orders-picking": () => import("./pages/orders-picking.js"),
  reports: () => import("./pages/reports.js"),
  "beneficiary-register": () => import("./pages/beneficiary-register.js"),
  "beneficiary-order": () => import("./pages/beneficiary-order.js"),
  "donor-register": () => import("./pages/donor-register.js"),
  "donor-donation": () => import("./pages/donor-donation.js"),
};

let currentPage;
const PUBLIC_ROUTES = new Set(["login"]);

export async function navigate() {
  const app = document.getElementById("app");
  const requestedKey = (location.hash.replace("#/", "") || "dashboard").split("?")[0];
  const session = getSession();
  const pageKey = !session && !PUBLIC_ROUTES.has(requestedKey) ? "login" : requestedKey;
  let safeKey = routes[pageKey] ? pageKey : session ? getRoleHome(session.role) : "login";
  if (session && safeKey !== "login" && !canAccessRoute(session.role, safeKey)) {
    safeKey = getRoleHome(session.role);
    location.hash = `#/${safeKey}`;
    return;
  }
  if (session && safeKey === "login") {
    location.hash = `#/${getRoleHome(session.role)}`;
    return;
  }
  const routeLoader = routes[safeKey];
  document.getElementById("pageTitle").textContent =
    safeKey === "login" ? "Login" : STRINGS.routes.find(([key]) => key === safeKey)?.[1] || "Dashboard";

  if (currentPage?.destroy) currentPage.destroy();
  app.classList.remove("route-enter");
  void app.offsetWidth;
  app.classList.add("route-enter");

  try {
    const mod = await routeLoader();
    currentPage = mod;
    await mod.render(app, { hash: location.hash });
    app.focus();
  } catch (error) {
    app.innerHTML = `<div class="card"><h3>Failed to load page</h3><p class="muted">${error.message}</p></div>`;
  }
}
