import { createZone, deleteZone, listZones, updateZone } from "../services/api/zones.js";
import { adjustInventory, listInventory } from "../services/api/inventory.js";
import { bindPagination, bindSortSelect, confirmModal, renderPagination, renderSortSelect, showToast } from "../ui/components.js";
import { formDataToObject, nonNegativeNumber, parseNumber, required } from "../ui/forms.js";
import { store } from "../store.js";

const PAGE_SIZE = 10;
const TEMP_BAND_OPTIONS = ["Ambient", "Chilled", "Frozen", "Mixed"];

// ── collapse state ────────────────────────────────────────────────────────────
const COLLAPSE_KEY = "fdms_storage_collapse";
function loadCollapse() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
}
function saveCollapse(state) { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state)); }

// ── zone form ─────────────────────────────────────────────────────────────────
function zoneForm(z = {}) {
  return `
    <form id="zoneForm" class="form-grid">
      <label>Zone Name<input name="ZoneName" value="${z.ZoneName || ""}" required></label>
      <label>Temp Band
        <select name="TempBand" required>
          <option value="" disabled ${!z.TempBand ? "selected" : ""} hidden>-- Select --</option>
          ${TEMP_BAND_OPTIONS.map((t) => `<option value="${t}" ${z.TempBand === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <label>Capacity kg<input type="number" min="0" step="0.01" name="CapacityKg" value="${z.CapacityKg || 0}"></label>
      <label style="grid-column:1/-1">Notes<input name="Notes" value="${z.Notes || ""}"></label>
      <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
    </form>`;
}

function fkErrorMessage(err) {
  if (err?.code === "23503") return "Cannot delete: this zone still has inventory records depending on it.";
  return err?.message || "Delete failed.";
}

function openModal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

// ── section toggle helper ─────────────────────────────────────────────────────
function applyCollapse(container, id, collapsed) {
  const section = container.querySelector(`[data-section="${id}"]`);
  if (!section) return;
  section.querySelector(".section-body").style.display = collapsed ? "none" : "";
  section.querySelector("[data-toggle]").textContent = collapsed ? "▶ Expand" : "▼ Collapse";
}

function sectionShell(id, title, bodyId, controls = "") {
  return `
    <section class="card" data-section="${id}">
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:.75rem">
          <button class="btn btn-ghost" data-toggle="${id}" style="font-size:.8rem;padding:.25rem .6rem">▼ Collapse</button>
          <h3 style="margin:0">${title}</h3>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">${controls}</div>
      </div>
      <div class="section-body" id="${bodyId}"></div>
    </section>`;
}

// ── ZONES section ─────────────────────────────────────────────────────────────
async function renderZones(container, collapseState) {
  const ZONE_SORT_OPTIONS = [
    { label: "Name A→Z",        sort: "ZoneName",   sortDir: "asc"  },
    { label: "Name Z→A",        sort: "ZoneName",   sortDir: "desc" },
    { label: "Capacity (high)", sort: "CapacityKg", sortDir: "desc" },
    { label: "Capacity (low)",  sort: "CapacityKg", sortDir: "asc"  },
  ];
  const qs = { search: "", sort: "ZoneName", sortDir: "asc", tempBand: "" };

  const controls = `
    <select id="zoneTempFilter" aria-label="Filter by temp band">
      <option value="">All Temp Bands</option>
      ${TEMP_BAND_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
    </select>
    ${renderSortSelect(ZONE_SORT_OPTIONS, qs)}
    <button class="btn btn-primary" id="newZone">Create Zone</button>`;

  container.querySelector("#zonesWrap").innerHTML = `
    ${sectionShell("zones", "Storage Zones", "zonesBody", controls)}`;

  applyCollapse(container, "zones", !!collapseState.zones);

  const [zones, inventory] = await Promise.all([listZones(), listInventory({ size: 9999 })]);
  const allInv = inventory.rows;

  async function loadZones() {
    const [fresh, freshInv] = await Promise.all([
      listZones({ search: qs.search, sort: qs.sort === "UsedKg" ? "ZoneName" : qs.sort, sortDir: qs.sortDir }),
      listInventory({ size: 9999 }),
    ]);
    let rows = fresh.map((z) => ({
      ...z,
      _usedKg: freshInv.rows.filter((i) => String(i.ZoneID) === String(z.ZoneID)).reduce((s, i) => s + Number(i.OnHandKg || 0), 0),
    }));
    if (qs.tempBand) rows = rows.filter((z) => z.TempBand === qs.tempBand);

    container.querySelector("#zonesBody").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Zone</th><th>Temp Band</th><th>Capacity kg</th><th>Used kg</th><th>Utilization</th><th></th></tr></thead>
          <tbody>${rows.map((z) => {
            const pct = z.CapacityKg ? (z._usedKg / z.CapacityKg) * 100 : 0;
            return `<tr>
              <td>${z.ZoneName}</td><td>${z.TempBand || ""}</td><td>${z.CapacityKg}</td><td>${z._usedKg.toFixed(2)}</td>
              <td><div class="progress"><span style="width:${Math.min(100, pct)}%"></span></div><small>${pct.toFixed(1)}%</small></td>
              <td>
                <button class="btn btn-ghost" data-zedit="${z.ZoneID}">Edit</button>
                <button class="btn btn-danger" data-zdel="${z.ZoneID}">Delete</button>
              </td>
            </tr>`;
          }).join("") || `<tr><td colspan="6" class="muted">No zones found.</td></tr>`}</tbody>
        </table>
      </div>`;

    container.querySelectorAll("[data-zedit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = rows.find((x) => String(x.ZoneID) === btn.dataset.zedit);
        const m = openModal(`<h3>Edit Zone</h3>${zoneForm(row)}`);
        m.querySelector("#zoneForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          if (!required(payload.ZoneName) || !nonNegativeNumber(payload.CapacityKg)) return showToast("Invalid zone data", "error");
          await updateZone(row.ZoneID, payload);
          m.innerHTML = "";
          showToast("Zone updated");
          loadZones().catch(() => {});
        });
      }),
    );
    container.querySelectorAll("[data-zdel]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Delete zone?",
          message: "Delete only when no inventory depends on it.",
          onConfirm: async () => {
            try {
              await deleteZone(btn.dataset.zdel);
              showToast("Zone deleted");
              loadZones().catch(() => {});
            } catch (err) {
              showToast(fkErrorMessage(err), "error");
            }
          },
        }),
      ),
    );
  }

  await loadZones();

  bindSortSelect(container.querySelector("[data-section='zones']"), qs, () => loadZones().catch((e) => showToast(e.message, "error")));
  container.querySelector("#zoneTempFilter").addEventListener("change", (e) => {
    qs.tempBand = e.target.value; loadZones().catch((err) => showToast(err.message, "error"));
  });
  container.querySelector("#newZone").addEventListener("click", () => {
    const m = openModal(`<h3>Create Zone</h3>${zoneForm()}`);
    m.querySelector("#zoneForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      if (!required(payload.ZoneName) || !nonNegativeNumber(payload.CapacityKg)) return showToast("Invalid zone data", "error");
      await createZone(payload);
      m.innerHTML = "";
      showToast("Zone created");
      loadZones().catch(() => {});
    });
  });
}

// ── INVENTORY section ─────────────────────────────────────────────────────────
async function renderInventorySection(container, collapseState) {
  const INV_SORT_OPTIONS = [
    { label: "Updated (newest)",        sort: "LastUpdated",  sortDir: "desc" },
    { label: "Updated (oldest)",        sort: "LastUpdated",  sortDir: "asc"  },
    { label: "On Hand Units (high)",    sort: "OnHandUnits",  sortDir: "desc" },
    { label: "On Hand Units (low)",     sort: "OnHandUnits",  sortDir: "asc"  },
    { label: "Zone → Updated (newest)", sort: "ZoneName",     sortDir: "asc",  sort2: "LastUpdated", sortDir2: "desc" },
    { label: "Zone → Units (high)",     sort: "ZoneName",     sortDir: "asc",  sort2: "OnHandUnits", sortDir2: "desc" },
  ];
  const qs = { search: store.globalSearch, sort: "LastUpdated", sortDir: "desc", tempBand: "", page: 1 };

  const controls = `
    <select id="invTempFilter" aria-label="Filter by temp band">
      <option value="">All Temp Bands</option>
      ${TEMP_BAND_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
    </select>
    ${renderSortSelect(INV_SORT_OPTIONS, qs)}`;

  container.querySelector("#inventoryWrap").innerHTML =
    sectionShell("inventory", "Inventory", "inventoryBody", controls);

  applyCollapse(container, "inventory", !!collapseState.inventory);

  async function loadInv() {
    const { rows, total } = await listInventory({ search: qs.search, page: qs.page, size: PAGE_SIZE });

    let filtered = rows;
    if (qs.tempBand) filtered = rows.filter((r) => r.tblStorageZone?.TempBand === qs.tempBand);

    filtered.sort((a, b) => {
      const dir = qs.sortDir === "asc" ? 1 : -1;
      const key = qs.sort === "ZoneName" ? "ZoneID" : qs.sort;
      const aVal = a[key] ?? ""; const bVal = b[key] ?? "";
      const primary = !isNaN(Number(aVal)) ? (Number(aVal) - Number(bVal)) * dir : String(aVal).localeCompare(String(bVal)) * dir;
      if (primary !== 0 || !qs.sort2) return primary;
      const dir2 = qs.sortDir2 === "asc" ? 1 : -1;
      const key2 = qs.sort2 === "ZoneName" ? "ZoneID" : qs.sort2;
      const aVal2 = a[key2] ?? ""; const bVal2 = b[key2] ?? "";
      return !isNaN(Number(aVal2)) ? (Number(aVal2) - Number(bVal2)) * dir2 : String(aVal2).localeCompare(String(bVal2)) * dir2;
    });

    const tbody = filtered.map((r) => `<tr>
      <td>${r.InventoryID}</td><td>${r.tblStorageZone?.ZoneName || r.ZoneID}</td><td>${r.LotID}</td>
      <td>${r.OnHandUnits}</td><td>${Number(r.OnHandKg || 0).toFixed(2)}</td>
      <td>${(r.LastUpdated || "").slice(0, 10)}</td>
      <td><button class="btn btn-ghost" data-adjust="${r.InventoryID}" data-units="${r.OnHandUnits}">Adjust</button></td>
    </tr>`).join("") || `<tr><td colspan="7" class="muted">No inventory found.</td></tr>`;

    container.querySelector("#inventoryBody").innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Zone</th><th>LotID</th><th>Units</th><th>kg</th><th>Updated</th><th></th></tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      <div id="invPager"></div>`;

    const pager = container.querySelector("#invPager");
    pager.innerHTML = renderPagination({ page: qs.page, size: PAGE_SIZE, total });
    bindPagination(pager, (p) => { qs.page = p; loadInv().catch((e) => showToast(e.message, "error")); });

    container.querySelectorAll("[data-adjust]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const m = openModal(`
          <h3>Inventory Adjustment</h3>
          <p class="muted">Current on-hand: <strong>${btn.dataset.units}</strong> units</p>
          <form id="adjForm" class="form-grid">
            <label>Delta Units (+/-)<input name="delta" type="number" step="1" required></label>
            <label style="grid-column:1/-1">Reason<input name="reason" placeholder="Damaged / Cycle count / Correction"></label>
            <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Apply</button></div>
          </form>`);
        m.querySelector("#adjForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          await adjustInventory({ inventoryId: btn.dataset.adjust, deltaUnits: parseNumber(new FormData(e.currentTarget).get("delta")) });
          m.innerHTML = "";
          showToast("Inventory updated");
          loadInv().catch(() => {});
        });
      }),
    );
  }

  await loadInv();

  bindSortSelect(container.querySelector("[data-section='inventory']"), qs, () => loadInv().catch((e) => showToast(e.message, "error")));
  container.querySelector("#invTempFilter").addEventListener("change", (e) => {
    qs.tempBand = e.target.value; qs.page = 1; loadInv().catch((err) => showToast(err.message, "error"));
  });

  return { onSearch: (term) => { qs.search = term; qs.page = 1; loadInv().catch((e) => showToast(e.message, "error")); } };
}

// ── main render ───────────────────────────────────────────────────────────────
let unsubSearch;

export async function render(container) {
  const collapseState = loadCollapse();

  container.innerHTML = `<div class="page-grid"><div id="zonesWrap"></div><div id="inventoryWrap"></div></div>`;

  await renderZones(container, collapseState);
  const { onSearch } = await renderInventorySection(container, collapseState);

  // toggle handlers
  container.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      collapseState[id] = !collapseState[id];
      saveCollapse(collapseState);
      applyCollapse(container, id, collapseState[id]);
    });
  });

  function handleSearch(e) {
    const term = e.detail ?? store.globalSearch;
    onSearch(term);
  }
  window.addEventListener("global-search", handleSearch);
  unsubSearch = () => window.removeEventListener("global-search", handleSearch);
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
