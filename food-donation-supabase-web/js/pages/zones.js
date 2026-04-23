import { createZone, deleteZone, listZones, updateZone } from "../services/api/zones.js";
import { listInventory } from "../services/api/inventory.js";
import { bindSortSelect, confirmModal, renderSortSelect, showToast } from "../ui/components.js";
import { formDataToObject, nonNegativeNumber, required } from "../ui/forms.js";
import { store } from "../store.js";

const TEMP_BAND_OPTIONS = ["Ambient", "Chilled", "Frozen", "Mixed"];

const SORT_OPTIONS = [
  { label: "Name A→Z",        sort: "ZoneName",   sortDir: "asc"  },
  { label: "Name Z→A",        sort: "ZoneName",   sortDir: "desc" },
  { label: "Capacity (high)", sort: "CapacityKg", sortDir: "desc" },
  { label: "Capacity (low)",  sort: "CapacityKg", sortDir: "asc"  },
  { label: "Used (high)",     sort: "UsedKg",     sortDir: "desc" },
  { label: "Used (low)",      sort: "UsedKg",     sortDir: "asc"  },
];

let unsubSearch;

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

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
    </form>
  `;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, sort: "ZoneName", sortDir: "asc", tempBand: "" };

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Storage Zones</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select id="tempBandFilter" aria-label="Filter by temp band">
            <option value="">All Temp Bands</option>
            ${TEMP_BAND_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
          <button class="btn btn-primary" id="newZone">Create Zone</button>
        </div>
      </div>
      <div class="table-wrap">
        <table><thead><tr><th>Zone</th><th>Temp Band</th><th>Capacity kg</th><th>Used kg</th><th>Utilization</th><th></th></tr></thead><tbody id="rows"></tbody></table>
      </div>
    </section>
  `;

  async function load() {
    const [zones, inventory] = await Promise.all([
      listZones({ search: queryState.search, sort: queryState.sort === "UsedKg" ? "ZoneName" : queryState.sort, sortDir: queryState.sortDir }),
      listInventory(),
    ]);

    // compute usedKg per zone
    let rows = zones.map((z) => {
      const used = inventory.filter((i) => String(i.ZoneID) === String(z.ZoneID)).reduce((s, i) => s + Number(i.OnHandKg || 0), 0);
      return { ...z, _usedKg: used };
    });

    // client-side filter by tempBand
    if (queryState.tempBand) rows = rows.filter((z) => z.TempBand === queryState.tempBand);

    // client-side sort by UsedKg
    if (queryState.sort === "UsedKg") {
      rows.sort((a, b) => queryState.sortDir === "asc" ? a._usedKg - b._usedKg : b._usedKg - a._usedKg);
    }

    container.querySelector("#rows").innerHTML = rows
      .map((z) => {
        const pct = z.CapacityKg ? (z._usedKg / z.CapacityKg) * 100 : 0;
        return `<tr>
          <td>${z.ZoneName}</td><td>${z.TempBand || ""}</td><td>${z.CapacityKg}</td><td>${z._usedKg.toFixed(2)}</td>
          <td><div class="progress"><span style="width:${Math.min(100, pct)}%"></span></div><small>${pct.toFixed(1)}%</small></td>
          <td><button class="btn btn-ghost" data-edit="${z.ZoneID}">Edit</button> <button class="btn btn-danger" data-del="${z.ZoneID}">Delete</button></td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6" class="muted">No zones found.</td></tr>`;

    container.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = rows.find((x) => String(x.ZoneID) === btn.dataset.edit);
        const m = modal(`<h3>Edit Zone</h3>${zoneForm(row)}`);
        m.querySelector("#zoneForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          if (!required(payload.ZoneName) || !nonNegativeNumber(payload.CapacityKg)) return showToast("Invalid zone data", "error");
          await updateZone(row.ZoneID, payload);
          m.innerHTML = "";
          showToast("Zone updated");
          load().catch(() => {});
        });
      }),
    );

    container.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Delete zone?",
          message: "Delete only when no inventory depends on it.",
          onConfirm: async () => {
            await deleteZone(btn.dataset.del);
            showToast("Zone deleted");
            await load();
          },
        }),
      ),
    );
  }

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#tempBandFilter").addEventListener("change", (e) => {
    queryState.tempBand = e.target.value;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#newZone").addEventListener("click", () => {
    const m = modal(`<h3>Create Zone</h3>${zoneForm()}`);
    m.querySelector("#zoneForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      if (!required(payload.ZoneName) || !nonNegativeNumber(payload.CapacityKg)) return showToast("Invalid zone data", "error");
      await createZone(payload);
      m.innerHTML = "";
      showToast("Zone created");
      load().catch(() => {});
    });
  });

  function onSearch(e) {
    queryState.search = e.detail ?? store.globalSearch;
    load().catch((err) => showToast(err.message, "error"));
  }
  window.addEventListener("global-search", onSearch);
  unsubSearch = () => window.removeEventListener("global-search", onSearch);

  load().catch((e) => showToast(e.message, "error"));
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
