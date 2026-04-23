import { listLots, putToZone, receiveLot } from "../services/api/lots.js";
import { listDonors } from "../services/api/donors.js";
import { listProducts } from "../services/api/products.js";
import { listZones } from "../services/api/zones.js";
import { bindPagination, bindSortSelect, renderPagination, renderSortSelect, showToast, skeletonRows } from "../ui/components.js";
import { formDataToObject, parseNumber, required, validateLotDates } from "../ui/forms.js";
import { store } from "../store.js";
const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);
// 香港時間 UTC+8 的今日日期
const todayHKT = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const TEMP_OPTIONS = ["Ambient", "Chilled", "Frozen"];

const SORT_OPTIONS = [
  { label: "Received (newest)",       sort: "ReceivedDate",  sortDir: "desc" },
  { label: "Received (oldest)",       sort: "ReceivedDate",  sortDir: "asc"  },
  { label: "Expiry (soonest)",        sort: "ExpiryDate",    sortDir: "asc"  },
  { label: "Expiry (latest)",         sort: "ExpiryDate",    sortDir: "desc" },
  { label: "LotID (asc)",             sort: "LotID",         sortDir: "asc"  },
  { label: "LotID (desc)",            sort: "LotID",         sortDir: "desc" },
  { label: "Qty (asc)",               sort: "QuantityUnits", sortDir: "asc"  },
  { label: "Qty (desc)",              sort: "QuantityUnits", sortDir: "desc" },
  { label: "Unit kg (light)",         sort: "UnitWeightKg",  sortDir: "asc"  },
  { label: "Unit kg (heavy)",         sort: "UnitWeightKg",  sortDir: "desc" },
  { label: "Product → Expiry (FEFO)", sort: "ProductID",     sortDir: "asc",  sort2: "ExpiryDate",   sortDir2: "asc"  },
  { label: "Donor → Expiry",          sort: "DonorID",       sortDir: "asc",  sort2: "ExpiryDate",   sortDir2: "asc"  },
  { label: "Status → Received",       sort: "Status",        sortDir: "asc",  sort2: "ReceivedDate", sortDir2: "desc" },
];

let unsubSearch;

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, filters: {}, sort: "ReceivedDate", sortDir: "desc", fromDate: "", toDate: "", expiryFilter: "", page: 1 };

  // apply context filter set by admin-workspace alert button
  if (store.contextLotsFilter) {
    const { expiryFilter, sort, sortDir } = store.contextLotsFilter;
    if (expiryFilter) queryState.expiryFilter = expiryFilter;
    if (sort)         queryState.sort = sort;
    if (sortDir)      queryState.sortDir = sortDir;
    store.contextLotsFilter = null;
  }

  const allProducts = (await listProducts({ page: 1, size: 200 })).rows;

  container.innerHTML = `
    <section class="card">
      <div class="toolbar" style="flex-wrap:wrap;gap:.5rem">
        <h3>Donation Lots</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:.25rem;font-size:.85rem">
            From <input type="date" id="fromDate" style="font-size:.85rem">
          </label>
          <label style="display:flex;align-items:center;gap:.25rem;font-size:.85rem">
            To <input type="date" id="toDate" style="font-size:.85rem">
          </label>
          <select id="productFilter" aria-label="Filter by product">
            <option value="">All Products</option>
            ${allProducts.map((p) => `<option value="${p.ProductID}">${p.ProductName}</option>`).join("")}
          </select>
          <select id="expiryFilter" aria-label="Filter by expiry status">
            <option value="">All Expiry</option>
            <option value="active" ${queryState.expiryFilter === "active" ? "selected" : ""}>Not Expired</option>
            <option value="expired" ${queryState.expiryFilter === "expired" ? "selected" : ""}>Expired</option>
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
          <button class="btn btn-primary" id="newLot">Receive Lot</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>LotID</th><th>Donor</th><th>Product</th><th>Qty</th><th>Unit kg</th><th>Expiry</th><th>Received</th><th>Status</th><th></th></tr></thead>
          <tbody id="rows">${skeletonRows(9)}</tbody>
        </table>
      </div>
      <div id="pager"></div>
    </section>
  `;

  async function load() {
    let rows = await listLots({
      search: queryState.search,
      filters: queryState.filters,
      sort: queryState.sort,
      sortDir: queryState.sortDir,
      sort2: queryState.sort2,
      sortDir2: queryState.sortDir2,
      fromDate: queryState.fromDate,
      toDate: queryState.toDate,
    });
    if (queryState.expiryFilter) {
      const hkt = todayHKT();
      rows = rows.filter((r) =>
        queryState.expiryFilter === "expired" ? r.ExpiryDate < hkt : r.ExpiryDate >= hkt
      );
    }
    const total = rows.length;
    const from = (queryState.page - 1) * PAGE_SIZE;
    const paged = rows.slice(from, from + PAGE_SIZE);
    container.querySelector("#rows").innerHTML =
      paged.map((r) => {
        const soon = r.ExpiryDate && (new Date(r.ExpiryDate).getTime() - new Date(todayHKT()).getTime()) / 86400000 <= 7;
        return `<tr>
          <td>${r.LotID}</td><td>${r.tblDonor?.DonorName || r.DonorID}</td><td>${r.tblProduct?.ProductName || r.ProductID}</td>
          <td>${r.QuantityUnits}</td><td>${r.UnitWeightKg}</td><td>${r.ExpiryDate || ""}</td><td>${r.ReceivedDate || ""}</td>
          <td><span class="badge ${soon ? "warn" : "ok"}">${r.Status || ""}</span></td>
          <td><button class="btn btn-ghost" data-zone="${r.LotID}">Put to Zone</button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="9" class="muted">No lots found.</td></tr>`;

    const pager = container.querySelector("#pager");
    pager.innerHTML = renderPagination({ page: queryState.page, size: PAGE_SIZE, total });
    bindPagination(pager, (p) => { queryState.page = p; load().catch((e) => showToast(e.message, "error")); });

    container.querySelectorAll("[data-zone]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const zones = await listZones();
        const m = modal(`
          <h3>Put Lot ${btn.dataset.zone} to Zone</h3>
          <form id="putZoneForm" class="form-grid">
            <label>Zone
              <select name="zoneId">${zones.map((z) => `<option value="${z.ZoneID}">${z.ZoneName}</option>`).join("")}</select>
            </label>
            <label>Units <input name="units" type="number" min="1" step="1" required></label>
            <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
          </form>
        `);
        m.querySelector("#putZoneForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          await putToZone({ lotId: btn.dataset.zone, zoneId: payload.zoneId, units: parseNumber(payload.units) });
          m.innerHTML = "";
          showToast("Lot moved to zone");
          load().catch(() => {});
        });
      }),
    );
  }

  container.querySelector("#fromDate").addEventListener("change", (e) => {
    queryState.fromDate = e.target.value; queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });
  container.querySelector("#toDate").addEventListener("change", (e) => {
    queryState.toDate = e.target.value; queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });
  container.querySelector("#productFilter").addEventListener("change", (e) => {
    if (e.target.value) queryState.filters = { ...queryState.filters, ProductID: e.target.value };
    else { const { ProductID: _, ...rest } = queryState.filters; queryState.filters = rest; }
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });
  container.querySelector("#expiryFilter").addEventListener("change", (e) => {
    queryState.expiryFilter = e.target.value; queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#newLot").addEventListener("click", async () => {
    const [donorsRes, productsRes] = await Promise.all([listDonors({ page: 1, size: 100 }), listProducts({ page: 1, size: 100 })]);
    const donors = donorsRes.rows;
    const products = productsRes.rows;
    const m = modal(`
      <h3>Receive Donation Lot</h3>
      <form id="lotForm" class="form-grid">
        <label>Donor<select name="DonorID" required><option value="" disabled selected hidden>-- Select --</option>${donors.map((d) => `<option value="${d.DonorID}">${d.DonorName}</option>`).join("")}</select></label>
        <label>Product<select name="ProductID" required><option value="" disabled selected hidden>-- Select --</option>${products.map((p) => `<option value="${p.ProductID}">${p.ProductName}</option>`).join("")}</select></label>
        <label>Quantity Units<input name="QuantityUnits" type="number" min="0" step="1" required></label>
        <label>Unit Weight kg<input name="UnitWeightKg" id="unitWeightDisplay" readonly style="background:var(--bg);color:var(--text-muted);cursor:default" placeholder="Auto-filled from product"></label>
        <input type="hidden" name="ReceivedDate" value="${today()}">
        <label>Received Date<input value="${today()}" readonly style="background:var(--bg);color:var(--text-muted);cursor:default"></label>
        <label>Expiry Date<input name="ExpiryDate" type="date" required></label>
        <label>Temp Requirement
          <select name="TempRequirement" id="tempReqSelect" required>
            <option value="" selected disabled hidden>-- Select --</option>
            ${TEMP_OPTIONS.map((temp) => `<option value="${temp}">${temp}</option>`).join("")}
          </select>
        </label>
        <label>Status<input name="Status" value="Received"></label>
        <label style="grid-column:1/-1">Notes<input name="Notes"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
      </form>
    `);
    m.querySelector("#lotForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      if (!required(payload.DonorID) || !required(payload.ProductID)) return showToast("Donor and product required", "error");
      if (!payload.TempRequirement) return showToast("Please select temperature requirement", "error");
      if (!validateLotDates(today(), payload.ExpiryDate)) return showToast("Expiry must be after received date", "error");
      await receiveLot(payload);
      m.innerHTML = "";
      showToast("Lot received");
      load().catch(() => {});
    });

    m.querySelector("[name='ProductID']").addEventListener("change", (e) => {
      const product = products.find((p) => String(p.ProductID) === e.target.value);
      const tempSelect = m.querySelector("#tempReqSelect");
      if (product?.TempRequirement && [...tempSelect.options].some((opt) => opt.value === product.TempRequirement)) {
        tempSelect.value = product.TempRequirement;
      }
      m.querySelector("#unitWeightDisplay").value = product?.UnitWeightKg ?? "";
    });
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
