import { listBeneficiaries } from "../services/api/beneficiaries.js";
import { listProducts } from "../services/api/products.js";
import { addOrderLine, cancelOrder, createOrder, listOpenOrders, listOrderLines, listOrders } from "../services/api/orders.js";
import { allocate, fefoCandidates, listPickAllocations, markPicked } from "../services/api/picks.js";
import { bindPagination, bindSortSelect, confirmModal, renderPagination, renderSortSelect, showToast } from "../ui/components.js";
import { formDataToObject, parseNumber } from "../ui/forms.js";
import { store } from "../store.js";

// ── collapse state ────────────────────────────────────────────────────────────
const COLLAPSE_KEY = "fdms_orderspicking_collapse";
function loadCollapse() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}"); } catch { return {}; }
}
function saveCollapse(s) { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); }

function applyCollapse(container, id, collapsed) {
  const section = container.querySelector(`[data-section="${id}"]`);
  if (!section) return;
  section.querySelector(".section-body").style.display = collapsed ? "none" : "";
  section.querySelector("[data-toggle]").textContent = collapsed ? "▶ Expand" : "▼ Collapse";
}

function sectionShell(id, title, controls = "") {
  return `
    <section class="card" data-section="${id}">
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:.75rem">
          <button class="btn btn-ghost" data-toggle="${id}" style="font-size:.8rem;padding:.25rem .6rem">▼ Collapse</button>
          <h3 style="margin:0">${title}</h3>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">${controls}</div>
      </div>
      <div class="section-body"></div>
    </section>`;
}

function openModal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

// ── ORDERS section ────────────────────────────────────────────────────────────
async function renderOrders(container, collapseState, onOrderSelect) {
  const SORT_OPTIONS = [
    { label: "Date (newest)",   sort: "OrderDate", sortDir: "desc" },
    { label: "Date (oldest)",   sort: "OrderDate", sortDir: "asc"  },
    { label: "Priority (high)", sort: "Priority",  sortDir: "desc" },
    { label: "Priority (low)",  sort: "Priority",  sortDir: "asc"  },
  ];
  const qs = { search: store.globalSearch, filters: {}, sort: "OrderDate", sortDir: "desc", page: 1 };
  const PAGE_SIZE = 10;

  // apply context filter set by admin-workspace alert button
  if (store.contextOrdersFilter) {
    if (store.contextOrdersFilter.status) qs.filters = { Status: store.contextOrdersFilter.status };
    store.contextOrdersFilter = null;
  }

  container.querySelector("#ordersWrap").innerHTML = sectionShell(
    "orders", "Orders",
    `<select id="statusFilter" aria-label="Filter by status">
      <option value="">All Status</option>
      <option value="Pending" ${qs.filters.Status === "Pending" ? "selected" : ""}>Pending</option>
      <option value="Allocated" ${qs.filters.Status === "Allocated" ? "selected" : ""}>Allocated</option>
      <option value="Completed" ${qs.filters.Status === "Completed" ? "selected" : ""}>Completed</option>
      <option value="Cancelled" ${qs.filters.Status === "Cancelled" ? "selected" : ""}>Cancelled</option>
    </select>
    ${renderSortSelect(SORT_OPTIONS, qs)}
    <button class="btn btn-primary" id="newOrder">Create Order</button>`
  );
  applyCollapse(container, "orders", !!collapseState.orders);

  let selectedOrderId = store.contextOrderId || null;

  async function loadOrders() {
    const allRows = await listOrders({ search: qs.search, filters: qs.filters, sort: qs.sort, sortDir: qs.sortDir, sort2: qs.sort2, sortDir2: qs.sortDir2 });
    const total = allRows.length;
    const rows = allRows.slice((qs.page - 1) * PAGE_SIZE, qs.page * PAGE_SIZE);

    const section = container.querySelector("[data-section='orders'] .section-body");
    section.innerHTML = `
      <div class="split" style="gap:1rem">
        <div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Beneficiary</th><th>Date</th><th>Status</th><th>Priority</th><th></th></tr></thead>
              <tbody id="orderRows"></tbody>
            </table>
          </div>
          <div id="orderPager"></div>
        </div>
        <div id="linePanel" class="muted" style="padding:.5rem">Select an order to view lines.</div>
      </div>`;

    section.querySelector("#orderRows").innerHTML = rows.map((o) => `
      <tr>
        <td>${o.OrderID}</td>
        <td>${o.tblBeneficiary?.BeneficiaryName || o.BeneficiaryID}</td>
        <td>${o.OrderDate || ""}</td>
        <td>${o.Status || ""}</td>
        <td>${o.Priority || ""}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" data-open="${o.OrderID}">Lines</button>
          <button class="btn btn-primary" data-pick="${o.OrderID}" ${["Completed","Cancelled"].includes(o.Status) ? "disabled style='opacity:.45;cursor:not-allowed'" : ""}>Pick ↓</button>
          ${o.Status === "Pending" ? `<button class="btn btn-danger" data-cancel="${o.OrderID}">Cancel</button>` : ""}
        </td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">No orders found.</td></tr>`;

    const pager = section.querySelector("#orderPager");
    pager.innerHTML = renderPagination({ page: qs.page, size: PAGE_SIZE, total });
    bindPagination(pager, (p) => { qs.page = p; loadOrders().catch((e) => showToast(e.message, "error")); });

    section.querySelectorAll("[data-open]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        selectedOrderId = btn.dataset.open;
        const lines = await listOrderLines(selectedOrderId);
        section.querySelector("#linePanel").innerHTML = `
          <p class="muted" style="margin-bottom:.5rem">Order #${selectedOrderId} lines</p>
          <div class="table-wrap">
            <table><thead><tr><th>LineID</th><th>Product</th><th>Qty</th><th>Notes</th></tr></thead>
              <tbody>${lines.map((l) => `<tr><td>${l.OrderLineID}</td><td>${l.tblProduct?.ProductName || l.ProductID}</td><td>${l.QtyUnits}</td><td>${l.Notes || ""}</td></tr>`).join("") || "<tr><td colspan='4' class='muted'>No lines</td></tr>"}</tbody>
            </table>
          </div>
          <div style="margin-top:.5rem;display:flex;justify-content:flex-end">
            <button class="btn btn-primary" id="addLine">Add Line</button>
          </div>`;

        section.querySelector("#addLine")?.addEventListener("click", async () => {
          const products = (await listProducts({ page: 1, size: 200 })).rows;
          const m = openModal(`
            <h3>Add Order Line</h3>
            <form id="lineForm" class="form-grid">
              <label>Product<select name="ProductID">${products.map((p) => `<option value="${p.ProductID}">${p.ProductName}</option>`).join("")}</select></label>
              <label>Qty Units<input name="QtyUnits" type="number" min="1" step="1" required></label>
              <label style="grid-column:1/-1">Notes<input name="Notes"></label>
              <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
            </form>`);
          m.querySelector("#lineForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = formDataToObject(e.currentTarget);
            payload.QtyUnits = parseNumber(payload.QtyUnits);
            await addOrderLine(selectedOrderId, payload);
            m.innerHTML = "";
            showToast("Line added");
            btn.click();
          });
        });
      }),
    );

    section.querySelectorAll("[data-pick]").forEach((btn) =>
      btn.addEventListener("click", () => {
        store.contextOrderId = btn.dataset.pick;
        onOrderSelect(btn.dataset.pick);
        // expand picking section if collapsed
        if (collapseState.picking) {
          collapseState.picking = false;
          saveCollapse(collapseState);
          applyCollapse(container, "picking", false);
        }
        container.querySelector("[data-section='picking']")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );

    section.querySelectorAll("[data-cancel]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Cancel order?",
          message: `Order #${btn.dataset.cancel} will be marked as Cancelled. This cannot be undone.`,
          onConfirm: async () => {
            try {
              await cancelOrder(btn.dataset.cancel);
              showToast(`Order #${btn.dataset.cancel} cancelled.`);
              loadOrders().catch(() => {});
            } catch (err) {
              showToast(err.message, "error");
            }
          },
        }),
      ),
    );
  }

  await loadOrders();

  bindSortSelect(container.querySelector("[data-section='orders']"), qs, () => { qs.page = 1; loadOrders().catch((e) => showToast(e.message, "error")); });
  container.querySelector("#statusFilter").addEventListener("change", (e) => {
    qs.filters = e.target.value ? { Status: e.target.value } : {};
    qs.page = 1;
    loadOrders().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#newOrder").addEventListener("click", async () => {
    const beneficiaries = (await listBeneficiaries({ page: 1, size: 200 })).rows;
    const m = openModal(`
      <h3>Create Order</h3>
      <form id="orderForm" class="form-grid">
        <label>Beneficiary<select name="BeneficiaryID" required><option value="" disabled selected hidden>-- Select --</option>${beneficiaries.map((b) => `<option value="${b.BeneficiaryID}">${b.BeneficiaryName}</option>`).join("")}</select></label>
        <label>Date<input name="OrderDate" type="date" required></label>
        <label>Required Delivery Date<input name="RequiredDeliveryDate" type="date"></label>
        <label>Priority<select name="Priority" required><option value="" disabled selected hidden>-- Select --</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
        <label style="grid-column:1/-1">Notes<input name="Notes"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
      </form>`);
    m.querySelector("#orderForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      await createOrder({ ...formDataToObject(e.currentTarget), Status: "Pending" });
      m.innerHTML = "";
      showToast("Order created");
      loadOrders().catch(() => {});
    });
  });

  return { onSearch: (term) => { qs.search = term; qs.page = 1; loadOrders().catch((e) => showToast(e.message, "error")); } };
}

// ── PICKING section ───────────────────────────────────────────────────────────
async function renderPicking(container, collapseState) {
  container.querySelector("#pickingWrap").innerHTML = sectionShell("picking", "Picking & Allocation (FEFO)");
  applyCollapse(container, "picking", !!collapseState.picking);

  const section = container.querySelector("[data-section='picking'] .section-body");

  async function loadPicking(orderId) {
    if (!orderId) {
      section.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem">
          <select id="pickOrderSelect" style="min-width:200px"><option value="">Select open order...</option></select>
        </div>
        <p class="muted" style="padding:.5rem">Select an order above or click "Pick ↓" from the Orders section.</p>`;
      const orders = await listOpenOrders();
      const sel = section.querySelector("#pickOrderSelect");
      sel.innerHTML = `<option value="">Select open order...</option>${orders.map((o) => `<option value="${o.OrderID}">#${o.OrderID} — ${o.Status} (Priority ${o.Priority})</option>`).join("")}`;
      sel.addEventListener("change", () => loadPicking(sel.value).catch((e) => showToast(e.message, "error")));
      return;
    }

    const lines = await listOrderLines(orderId);
    const blocks = await Promise.all(lines.map(async (line) => ({ line, candidates: await fefoCandidates(line.ProductID) })));

    const allocations = await listPickAllocations(lines.map((l) => l.OrderLineID));

    section.innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0 .75rem">
        <select id="pickOrderSelect" style="min-width:200px"></select>
      </div>
      <div id="pickBlocks"></div>
      <article class="card" style="margin-top:.75rem">
        <h4>Current Allocations — Order #${orderId}</h4>
        <div class="table-wrap">
          <table><thead><tr><th>AllocationID</th><th>OrderLineID</th><th>Units</th><th>Picked At</th><th></th></tr></thead>
            <tbody>${(allocations || []).map((a) => `
              <tr><td>${a.AllocationID}</td><td>${a.OrderLineID}</td><td>${a.AllocUnits}</td><td>${a.PickedAt || "—"}</td>
              <td>${a.PickedAt ? "" : `<button class="btn btn-primary" data-pick="${a.AllocationID}">Mark Picked</button>`}</td></tr>`
            ).join("") || "<tr><td colspan='5' class='muted'>No allocations yet.</td></tr>"}</tbody>
        </table></div>
      </article>`;

    // re-populate order select
    const orders = await listOpenOrders();
    const sel = section.querySelector("#pickOrderSelect");
    sel.innerHTML = `<option value="">Select open order...</option>${orders.map((o) => `<option value="${o.OrderID}" ${String(o.OrderID) === String(orderId) ? "selected" : ""}>#${o.OrderID} — ${o.Status} (Priority ${o.Priority})</option>`).join("")}`;
    sel.addEventListener("change", () => loadPicking(sel.value).catch((e) => showToast(e.message, "error")));

    section.querySelector("#pickBlocks").innerHTML = blocks.map(({ line, candidates }) => `
      <article class="card" style="margin:.5rem 0">
        <h4>Line #${line.OrderLineID} — ${line.tblProduct?.ProductName || line.ProductID} (Requested: ${line.QtyUnits})</h4>
        <div class="table-wrap"><table>
          <thead><tr><th>LotID</th><th>Expiry</th><th>Stock</th><th>Alloc units</th><th></th></tr></thead>
          <tbody>${candidates.length
            ? candidates.map((c) => `<tr>
                <td>${c.LotID}</td><td>${c.ExpiryDate}</td><td>${c.inventory.OnHandUnits}</td>
                <td><input type="number" min="1" step="1" max="${c.inventory.OnHandUnits}" value="1" data-units="${line.OrderLineID}:${c.inventory.InventoryID}" style="width:80px"></td>
                <td><button class="btn btn-primary" data-alloc="${line.OrderLineID}:${c.inventory.InventoryID}">Allocate</button></td>
              </tr>`).join("")
            : `<tr><td colspan="5" class="muted">No inventory candidate.</td></tr>`}
          </tbody>
        </table></div>
      </article>`).join("");

    section.querySelectorAll("[data-alloc]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const [orderLineId, inventoryId] = btn.dataset.alloc.split(":");
        const input = section.querySelector(`[data-units="${btn.dataset.alloc}"]`);
        await allocate({ orderLineId, inventoryId, allocUnits: parseNumber(input.value) });
        showToast("Allocated");
        loadPicking(orderId).catch((e) => showToast(e.message, "error"));
      }),
    );

    section.querySelectorAll("[data-pick]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await markPicked(btn.dataset.pick);
        showToast("Marked picked");
        loadPicking(orderId).catch((e) => showToast(e.message, "error"));
      }),
    );
  }

  await loadPicking(store.contextOrderId || null);

  return { loadPicking };
}

// ── main render ───────────────────────────────────────────────────────────────
let unsubSearch;

export async function render(container) {
  const collapseState = loadCollapse();

  container.innerHTML = `<div class="page-grid"><div id="ordersWrap"></div><div id="pickingWrap"></div></div>`;

  let pickingRef;
  const { onSearch } = await renderOrders(container, collapseState, (orderId) => {
    pickingRef?.loadPicking(orderId).catch((e) => showToast(e.message, "error"));
  });
  pickingRef = await renderPicking(container, collapseState);

  container.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      collapseState[id] = !collapseState[id];
      saveCollapse(collapseState);
      applyCollapse(container, id, collapseState[id]);
    });
  });

  function handleSearch(e) {
    onSearch(e.detail ?? store.globalSearch);
  }
  window.addEventListener("global-search", handleSearch);
  unsubSearch = () => window.removeEventListener("global-search", handleSearch);
}

export function destroy() {
  if (unsubSearch) unsubSearch();
  store.contextOrderId = null;
}
