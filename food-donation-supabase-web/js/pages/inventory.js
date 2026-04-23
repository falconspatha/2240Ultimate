import { adjustInventory, listInventory } from "../services/api/inventory.js";
import { bindPagination, bindSortSelect, renderPagination, renderSortSelect, showToast } from "../ui/components.js";
import { parseNumber } from "../ui/forms.js";
import { store } from "../store.js";

const PAGE_SIZE = 10;
const TEMP_BAND_OPTIONS = ["Ambient", "Chilled", "Frozen", "Mixed"];

const SORT_OPTIONS = [
  { label: "InventoryID (asc)",       sort: "InventoryID",  sortDir: "asc"  },
  { label: "InventoryID (desc)",      sort: "InventoryID",  sortDir: "desc" },
  { label: "Zone ID (asc)",           sort: "ZoneName",     sortDir: "asc"  },
  { label: "Zone ID (desc)",          sort: "ZoneName",     sortDir: "desc" },
  { label: "Updated (newest)",        sort: "LastUpdated",  sortDir: "desc" },
  { label: "Updated (oldest)",        sort: "LastUpdated",  sortDir: "asc"  },
  { label: "On Hand Units (high)",    sort: "OnHandUnits",  sortDir: "desc" },
  { label: "On Hand Units (low)",     sort: "OnHandUnits",  sortDir: "asc"  },
  { label: "On Hand kg (high)",       sort: "OnHandKg",     sortDir: "desc" },
  { label: "On Hand kg (low)",        sort: "OnHandKg",     sortDir: "asc"  },
  { label: "Zone → Updated (newest)", sort: "ZoneName",     sortDir: "asc",  sort2: "LastUpdated", sortDir2: "desc" },
  { label: "Zone → Units (high)",     sort: "ZoneName",     sortDir: "asc",  sort2: "OnHandUnits", sortDir2: "desc" },
];

let unsubSearch;

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, sort: "InventoryID", sortDir: "asc", tempBand: "", page: 1 };

  container.innerHTML = `
    <section class="card">
      <div class="toolbar" style="flex-wrap:wrap;gap:.5rem">
        <h3>Inventory</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select id="tempBandFilter" aria-label="Filter by temp band">
            <option value="">All Temp Bands</option>
            ${TEMP_BAND_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>InventoryID</th><th>Zone</th><th>LotID</th><th>On Hand Units</th><th>On Hand kg</th><th>Updated</th><th></th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <div id="pager"></div>
    </section>
  `;

  async function load() {
    const { rows, total } = await listInventory({ search: queryState.search, page: queryState.page, size: PAGE_SIZE });

    let filtered = rows;
    if (queryState.tempBand) {
      filtered = rows.filter((r) => r.tblStorageZone?.TempBand === queryState.tempBand);
    }

    filtered.sort((a, b) => {
      const dir = queryState.sortDir === "asc" ? 1 : -1;
      const key = queryState.sort === "ZoneName" ? "ZoneID" : queryState.sort;
      const aVal = a[key] ?? ""; const bVal = b[key] ?? "";
      const primary = typeof aVal === "number" || !isNaN(Number(aVal))
        ? (Number(aVal) - Number(bVal)) * dir
        : String(aVal).localeCompare(String(bVal)) * dir;
      if (primary !== 0 || !queryState.sort2) return primary;
      const dir2 = queryState.sortDir2 === "asc" ? 1 : -1;
      const key2 = queryState.sort2 === "ZoneName" ? "ZoneID" : queryState.sort2;
      const aVal2 = a[key2] ?? ""; const bVal2 = b[key2] ?? "";
      return typeof aVal2 === "number" || !isNaN(Number(aVal2))
        ? (Number(aVal2) - Number(bVal2)) * dir2
        : String(aVal2).localeCompare(String(bVal2)) * dir2;
    });

    container.querySelector("#rows").innerHTML = filtered
      .map((r) => `<tr>
        <td>${r.InventoryID}</td><td>${r.tblStorageZone?.ZoneName || r.ZoneID}</td><td>${r.LotID}</td>
        <td>${r.OnHandUnits}</td><td>${Number(r.OnHandKg || 0).toFixed(2)}</td>
        <td>${(r.LastUpdated || "").slice(0, 10)}</td>
        <td><button class="btn btn-ghost" data-adjust="${r.InventoryID}" data-units="${r.OnHandUnits}">Adjust</button></td>
      </tr>`)
      .join("") || `<tr><td colspan="7" class="muted">No inventory found.</td></tr>`;

    const pager = container.querySelector("#pager");
    pager.innerHTML = renderPagination({ page: queryState.page, size: PAGE_SIZE, total });
    bindPagination(pager, (p) => { queryState.page = p; load().catch((e) => showToast(e.message, "error")); });

    container.querySelectorAll("[data-adjust]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const current = btn.dataset.units;
        const m = modal(`
          <h3>Inventory Adjustment</h3>
          <p class="muted">Current on-hand: <strong>${current}</strong> units</p>
          <form id="adjForm" class="form-grid">
            <label>Delta Units (+/-)<input name="delta" type="number" step="1" required></label>
            <label style="grid-column:1/-1">Reason<input name="reason" placeholder="Damaged / Cycle count / Correction"></label>
            <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Apply</button></div>
          </form>
        `);
        m.querySelector("#adjForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const delta = parseNumber(new FormData(e.currentTarget).get("delta"));
          await adjustInventory({ inventoryId: btn.dataset.adjust, deltaUnits: delta });
          m.innerHTML = "";
          showToast("Inventory updated");
          load().catch(() => {});
        });
      }),
    );
  }

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#tempBandFilter").addEventListener("change", (e) => {
    queryState.tempBand = e.target.value;
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  function onSearch(e) {
    queryState.search = e.detail ?? store.globalSearch;
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  }
  window.addEventListener("global-search", onSearch);
  unsubSearch = () => window.removeEventListener("global-search", onSearch);

  load().catch((e) => showToast(e.message, "error"));
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
