import { navigate } from "./router.js";
import { STRINGS } from "./ui/strings.js";
import { debounce } from "./ui/components.js";
import { store } from "./store.js";
import { getSession, logout } from "./auth/session.js";
import { canUseQuickAction, getRoleRoutes } from "./auth/authorization.js";

function renderNav() {
  const nav = document.getElementById("routeNav");
  const session = getSession();
  const allowed = session ? new Set(getRoleRoutes(session.role)) : new Set();
  nav.innerHTML = STRINGS.routes
    .filter(([key]) => allowed.has(key))
    .map(([key, label]) => `<a class="btn btn-ghost" href="#/${key}" data-nav="${key}">${label}</a>`)
    .join("");
}

function setupTheme() {
  document.documentElement.dataset.theme = store.theme;
  const toggle = document.getElementById("themeToggle");
  toggle.textContent = store.theme === "dark" ? "Light" : "Dark";
  toggle.addEventListener("click", () => {
    store.theme = store.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", store.theme);
    document.documentElement.dataset.theme = store.theme;
    toggle.textContent = store.theme === "dark" ? "Light" : "Dark";
  });
}

function setupGlobalSearch() {
  const input = document.getElementById("globalSearch");
  input.addEventListener(
    "input",
    debounce(() => {
      store.globalSearch = input.value;
      window.dispatchEvent(new CustomEvent("global-search", { detail: store.globalSearch }));
    }, 280),
  );
}

function setupQuickActions() {
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      location.hash = btn.dataset.route;
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("quick-create", { detail: btn.dataset.create }));
      });
    });
  });
}

function setElementVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function updateAuthUI() {
  const session = getSession();
  store.session = session;
  const isLoginRoute = location.hash.startsWith("#/login");
  document.querySelector(".app-shell")?.classList.toggle("auth-view", isLoginRoute);
  setElementVisible(document.querySelector(".sidebar"), !isLoginRoute);
  setElementVisible(document.getElementById("globalSearch")?.closest(".search-wrap"), !isLoginRoute);
  document.querySelectorAll(".quick-action").forEach((el) => {
    const action = el.dataset.create;
    const visible = !isLoginRoute && !!session && canUseQuickAction(session.role, action);
    setElementVisible(el, visible);
  });
  setElementVisible(document.getElementById("logoutBtn"), !isLoginRoute && !!session);
  renderNav();

  const badge = document.getElementById("sessionBadge");
  if (!badge) return;
  if (!session || isLoginRoute) {
    badge.textContent = "";
    badge.style.display = "none";
    return;
  }
  badge.style.display = "inline-flex";
  badge.textContent = `${session.displayName} (${session.role})`;
}

function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout();
    location.hash = "#/login";
  });
}

renderNav();
setupTheme();
setupGlobalSearch();
setupQuickActions();
setupLogout();
window.addEventListener("hashchange", async () => {
  updateAuthUI();
  await navigate();
});
updateAuthUI();
if (!getSession() && !location.hash.startsWith("#/login")) {
  location.hash = "#/login";
}
navigate();
