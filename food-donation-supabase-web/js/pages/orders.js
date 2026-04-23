import { listBeneficiaries } from "../services/api/beneficiaries.js";
import { listProducts } from "../services/api/products.js";
import { addOrderLine, createOrder, listOrderLines, listOrders } from "../services/api/orders.js";
import { bindSortSelect, renderSortSelect, showToast } from "../ui/components.js";
import { formDataToObject, parseNumber } from "../ui/forms.js";
import { store } from "../store.js";

const SORT_OPTIONS = [
  { label: "Date (newest)",   sort: "OrderDate", sortDir: "desc" },
  { label: "Date (oldest)",   sort: "OrderDate", sortDir: "asc"  },
  { label: "Priority (high)", sort: "Priority",  sortDir: "desc" },
  { label: "Priority (low)",  sort: "Priority",  sortDir: "asc"  },
];

let unsubSearch;

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, filters: {}, sort: "OrderDate", sortDir: "desc" };

  container.innerHTML = `
    <section class="split">
      <article class="card">
        <div class="toolbar" style="flex-wrap:wrap;gap:.5rem">
          <h3>Orders</h3>
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
            <select id="statusFilter" aria-label="Filter by status">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Allocated">Allocated</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            ${renderSortSelect(SORT_OPTIONS, queryState)}
            <button class="btn btn-primary" id="newOrder">Create Order</button>
          </div>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>ID</th><th>Beneficiary</th><th>Date</th><th>Status</th><th>Priority</th><th></th></tr></thead><tbody id="orderRows"></tbody></table>
        </div>
      </article>
      <article class="card">
        <div class="toolbar"><h3>Order Lines</h3><button class="btn btn-primary" id="newLine" disabled>Add Line</button></div>
        <div id="linePanel" class="muted">Select an order to view details.</div>
      </article>
    </section>
  `;

  let selectedOrderId = null;

  async function loadOrders() {
    const rows = await listOrders({ search: queryState.search, filters: queryState.filters, sort: queryState.sort, sortDir: queryState.sortDir, sort2: queryState.sort2, sortDir2: queryState.sortDir2 });
    container.querySelector("#orderRows").innerHTML = rows
      .map(
        (o) => `<tr>
      <td>${o.OrderID}</td><td>${o.tblBeneficiary?.BeneficiaryName || o.BeneficiaryID}</td><td>${o.OrderDate || ""}</td><td>${o.Status || ""}</td><td>${o.Priority || ""}</td>
      <td><button class="btn btn-ghost" data-open="${o.OrderID}">Open</button> <button class="btn btn-primary" data-alloc="${o.OrderID}">Allocate (FEFO)</button></td></tr>`,
      )
      .join("") || `<tr><td colspan="6" class="muted">No orders found.</td></tr>`;

    container.querySelectorAll("[data-open]").forEach((btn) =>
      btn.addEventListener("click", () => {
        selectedOrderId = btn.dataset.open;
        container.querySelector("#newLine").disabled = false;
        loadLines().catch((e) => showToast(e.message, "error"));
      }),
    );
    container.querySelectorAll("[data-alloc]").forEach((btn) =>
      btn.addEventListener("click", () => {
        store.contextOrderId = btn.dataset.alloc;
        location.hash = `#/picking?orderId=${btn.dataset.alloc}`;
      }),
    );
  }

  async function loadLines() {
    const lines = await listOrderLines(selectedOrderId);
    container.querySelector("#linePanel").innerHTML = `
      <p class="muted">Order #${selectedOrderId}</p>
      <div class="table-wrap">
        <table><thead><tr><th>LineID</th><th>Product</th><th>Qty Units</th><th>Notes</th></tr></thead>
          <tbody>${lines.map((l) => `<tr><td>${l.OrderLineID}</td><td>${l.tblProduct?.ProductName || l.ProductID}</td><td>${l.QtyUnits}</td><td>${l.Notes || ""}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }

  // Filter control
  container.querySelector("#statusFilter").addEventListener("change", (e) => {
    queryState.filters = e.target.value ? { Status: e.target.value } : {};
    loadOrders().catch((err) => showToast(err.message, "error"));
  });

  bindSortSelect(container, queryState, () => loadOrders().catch((e) => showToast(e.message, "error")));

  container.querySelector("#newOrder").addEventListener("click", async () => {
    const beneficiaries = (await listBeneficiaries({ page: 1, size: 200 })).rows;
    const m = modal(`
      <h3>Create Order</h3>
      <form id="orderForm" class="form-grid">
        <label>Beneficiary<select name="BeneficiaryID" required><option value="" disabled selected hidden>-- Select --</option>${beneficiaries.map((b) => `<option value="${b.BeneficiaryID}">${b.BeneficiaryName}</option>`).join("")}</select></label>
        <label>Date<input name="OrderDate" type="date" required></label>
        <label>Required Delivery Date<input name="RequiredDeliveryDate" type="date"></label>
        <label>Priority<select name="Priority" required><option value="" disabled selected hidden>-- Select --</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
        <label style="grid-column:1/-1">Notes<input name="Notes"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
      </form>
    `);
    m.querySelector("#orderForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      await createOrder({ ...formDataToObject(e.currentTarget), Status: "Pending" });
      m.innerHTML = "";
      showToast("Order created");
      loadOrders().catch(() => {});
    });
  });

  container.querySelector("#newLine").addEventListener("click", async () => {
    const products = (await listProducts({ page: 1, size: 200 })).rows;
    const m = modal(`
      <h3>Add Order Line</h3>
      <form id="lineForm" class="form-grid">
        <label>Product<select name="ProductID">${products.map((p) => `<option value="${p.ProductID}">${p.ProductName}</option>`).join("")}</select></label>
        <label>Qty Units<input name="QtyUnits" type="number" min="1" step="1" required></label>
        <label style="grid-column:1/-1">Notes<input name="Notes"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
      </form>
    `);
    m.querySelector("#lineForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      payload.QtyUnits = parseNumber(payload.QtyUnits);
      await addOrderLine(selectedOrderId, payload);
      m.innerHTML = "";
      showToast("Order line added");
      loadLines().catch(() => {});
    });
  });

  function onSearch(e) {
    queryState.search = e.detail ?? store.globalSearch;
    loadOrders().catch((err) => showToast(err.message, "error"));
  }
  window.addEventListener("global-search", onSearch);
  unsubSearch = () => window.removeEventListener("global-search", onSearch);

  await loadOrders();

  if (store.contextOrderId) {
    selectedOrderId = store.contextOrderId;
    container.querySelector("#newLine").disabled = false;
    await loadLines();
  }
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
