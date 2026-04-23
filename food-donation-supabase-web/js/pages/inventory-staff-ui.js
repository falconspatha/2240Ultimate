import { allocateOrderLineFEFO } from "../services/api/orders.js";
import {
  getInventoryDestinationBreakdown,
  listAllocationRowsByProduct,
  listProductOptionsWithTotals,
} from "../services/api/allocationDashboard.js";
import { exportCSV, showToast } from "../ui/components.js";
import { parseNumber } from "../ui/forms.js";

let state = {
  productId: "",
  donorId: "",
  zoneId: "",
  allocationStatus: "all",
  beneficiarySearch: "",
  products: [],
  groups: [],
  summary: null,
  flatRows: [],
  detail: null,
};

function renderSummary(summary) {
  if (!summary) return "";
  return `
    <section class="kpi-grid">
      <article class="card"><p class="muted">Total Lines</p><h2>${summary.totalLines}</h2></article>
      <article class="card"><p class="muted">On-hand Units</p><h2>${summary.totalOnHandUnits}</h2></article>
      <article class="card"><p class="muted">Allocated Units</p><h2>${summary.totalAllocatedUnits}</h2></article>
      <article class="card"><p class="muted">Available Units</p><h2>${summary.totalAvailableUnits}</h2></article>
      <article class="card"><p class="muted">Beneficiaries</p><h2>${summary.distinctBeneficiaries}</h2></article>
    </section>
  `;
}

function renderGroups(groups) {
  if (!groups?.length) return `<section class="card"><p class="muted">No inventory rows found for this filter set.</p></section>`;
  return groups
    .map(
      (group) => `
      <section class="card" style="margin-top:1rem">
        <div class="toolbar"><h3>Donor: ${group.donorName}</h3><small class="muted">${group.rows.length} row(s)</small></div>
        <div style="overflow:visible">
          <table style="table-layout:fixed;width:100%">
            <thead>
              <tr>
                <th style="white-space:normal">LotCode</th>
                <th style="white-space:normal">Zone</th>
                <th style="white-space:normal">Expiry</th>
                <th style="white-space:normal">OnHandU</th>
                <th style="white-space:normal">AllocU</th>
                <th style="white-space:normal">AvailU</th>
                <th style="white-space:normal;width:30%">Destination</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${group.rows
                .map(
                  (row) => `
                  <tr>
                    <td style="white-space:normal;word-break:break-word">${row.LotCode}</td>
                    <td style="white-space:normal;word-break:break-word">${row.ZoneName}</td>
                    <td style="white-space:normal">${row.ExpiryDate || ""}</td>
                    <td>${row.OnHandUnits}</td>
                    <td>${row.AllocatedUnits}</td>
                    <td>${row.AvailableUnits}</td>
                    <td style="white-space:normal;word-break:break-word">${row.DestinationSummary}</td>
                    <td><button class="btn btn-ghost" data-open-detail="${row.InventoryID}">Detail</button></td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>`,
    )
    .join("");
}

function renderDetail(detail) {
  if (!detail) return `<section class="card"><p class="muted">Select a row to view destination breakdown.</p></section>`;

  const destinationRows = detail.destinations?.length
    ? detail.destinations
        .map(
          (item) => `
        <tr>
          <td>${item.BeneficiaryName}</td><td>${item.OrderID || "-"}</td><td>${item.OrderLineID || "-"}</td>
          <td>${item.AllocUnits}</td><td>${item.AllocKg}</td><td>${item.PickedAt || "-"}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="muted">Unallocated</td></tr>`;

  const pendingRows = detail.pendingDemand?.length
    ? detail.pendingDemand
        .map(
          (line) => `
          <tr>
            <td>${line.BeneficiaryName}</td>
            <td>${line.OrderID}</td>
            <td>${line.OrderLineID}</td>
            <td>${line.RequestedUnits}</td>
            <td>${line.AllocatedUnits}</td>
            <td>${line.RemainingUnits}</td>
            <td><button class="btn btn-primary" data-alloc-line="${line.OrderLineID}">Allocate FEFO</button></td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" class="muted">No pending demand for this product.</td></tr>`;

  return `
    <section class="card" id="detailDrawer">
      <div class="toolbar"><h3>Detail: ${detail.inventory.LotCode}</h3></div>
      <p class="muted">
        Product: ${detail.inventory.ProductName} | Donor: ${detail.inventory.DonorName} | Zone: ${detail.inventory.ZoneName}
      </p>
      <p class="muted">
        Expiry: ${detail.inventory.ExpiryDate || "-"} | Temp: ${detail.inventory.TempRequirement} | OnHand: ${detail.inventory.OnHandUnits}
      </p>
      <article style="margin-top:.8rem">
        <h4>Destination Breakdown</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Beneficiary</th><th>Order</th><th>OrderLine</th><th>AllocU</th><th>AllocKg</th><th>PickedAt</th></tr></thead>
            <tbody>${destinationRows}</tbody>
          </table>
        </div>
      </article>
      <article style="margin-top:.8rem">
        <h4>Pending Demand (Same Product)</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Beneficiary</th><th>Order</th><th>OrderLine</th><th>ReqU</th><th>AllocU</th><th>RemainU</th><th></th></tr></thead>
            <tbody>${pendingRows}</tbody>
          </table>
        </div>
      </article>
    </section>
  `;
}

async function loadMain(container) {
  if (!state.productId) {
    state.groups = [];
    state.summary = null;
    state.flatRows = [];
    const summaryArea = document.getElementById("summaryArea");
    const groupArea = document.getElementById("groupArea");
    if (summaryArea) summaryArea.innerHTML = "";
    if (groupArea) groupArea.innerHTML = `<section class="card"><p class="muted">Select product to load inventory.</p></section>`;
    return;
  }

  const result = await listAllocationRowsByProduct(state.productId, {
    donorId: state.donorId,
    zoneId: state.zoneId,
    allocationStatus: state.allocationStatus,
    beneficiarySearch: state.beneficiarySearch,
  });
  state.groups = result.groups;
  state.summary = result.summary;
  state.flatRows = result.flatRows;

  const summaryArea = document.getElementById("summaryArea");
  const groupArea = document.getElementById("groupArea");
  if (summaryArea) summaryArea.innerHTML = renderSummary(state.summary);
  if (groupArea) groupArea.innerHTML = renderGroups(state.groups);
  bindDynamic(container);
}

async function openDetail(container, inventoryId) {
  try {
    state.detail = await getInventoryDestinationBreakdown(inventoryId);
    const detailArea = document.getElementById("detailArea");
    if (detailArea) detailArea.innerHTML = renderDetail(state.detail);
    bindDynamic(container);
  } catch (error) {
    showToast(error.message, "error");
    const detailArea = document.getElementById("detailArea");
    if (detailArea) detailArea.innerHTML = `<section class="card"><p class="muted">${error.message}</p></section>`;
  }
}

function bindDynamic(container) {
  container.querySelectorAll("[data-open-detail]").forEach((btn) =>
    btn.addEventListener("click", () => {
      openDetail(container, btn.dataset.openDetail).catch((e) => showToast(e.message, "error"));
    }),
  );

  container.querySelectorAll("[data-alloc-line]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        const orderLineId = parseNumber(btn.dataset.allocLine);
        if (!orderLineId) {
          showToast("Missing OrderLineID for allocation.", "error");
          return;
        }
        await allocateOrderLineFEFO(orderLineId);
        showToast("Allocated with FEFO.");
        await loadMain(container);
        if (state.detail?.inventory?.InventoryID) {
          await openDetail(container, state.detail.inventory.InventoryID);
        }
      } catch (error) {
        showToast(error.message, "error");
      }
    }),
  );
}

export async function render(container) {
  state = {
    productId: "",
    donorId: "",
    zoneId: "",
    allocationStatus: "all",
    beneficiarySearch: "",
    products: await listProductOptionsWithTotals(),
    groups: [],
    summary: null,
    flatRows: [],
    detail: null,
  };

  container.innerHTML = `
    <div class="page-grid">
      <section class="card">
        <div class="toolbar">
          <h3>Inventory Allocation UI</h3>
          <button class="btn btn-ghost" id="exportCsvBtn">Export CSV</button>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:.5rem">
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Product</th>
            <td style="border:none;padding-right:1.5rem">
              <select id="productSelect" required>
                <option value="" selected disabled hidden>-- Select Product --</option>
                ${state.products
                  .map((p) => `<option value="${p.ProductID}">${p.ProductName} (U:${p.OnHandUnits}, KG:${p.OnHandKg})</option>`)
                  .join("")}
              </select>
            </td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Allocation Status</th>
            <td style="border:none">
              <select id="allocationStatusFilter">
                <option value="all" selected>All</option>
                <option value="allocated">Allocated</option>
                <option value="unallocated">Unallocated</option>
              </select>
            </td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Donor ID</th>
            <td style="border:none;padding-right:1.5rem"><input id="donorFilter" placeholder="optional"></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Zone ID</th>
            <td style="border:none"><input id="zoneFilter" placeholder="optional"></td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Beneficiary Search</th>
            <td colspan="3" style="border:none"><input id="beneficiarySearch" placeholder="name keyword"></td>
          </tr>
        </table>
      </section>
      <div id="summaryArea"></div>
      <div id="groupArea" style="min-width:0"><section class="card"><p class="muted">Select product to load inventory.</p></section></div>
      <div id="detailArea" style="min-width:0"><section class="card"><p class="muted">Select a row to view destination breakdown.</p></section></div>
    </div>
  `;

  const productSelect = container.querySelector("#productSelect");
  const donorFilter = container.querySelector("#donorFilter");
  const zoneFilter = container.querySelector("#zoneFilter");
  const allocationStatusFilter = container.querySelector("#allocationStatusFilter");
  const beneficiarySearch = container.querySelector("#beneficiarySearch");

  const reload = () => loadMain(container).catch((e) => showToast(e.message, "error"));

  productSelect.addEventListener("change", () => {
    state.productId = productSelect.value;
    state.detail = null;
    const detailArea = document.getElementById("detailArea");
    if (detailArea) detailArea.innerHTML = "";
    reload();
  });
  donorFilter.addEventListener("input", () => { state.donorId = donorFilter.value.trim(); reload(); });
  zoneFilter.addEventListener("input", () => { state.zoneId = zoneFilter.value.trim(); reload(); });
  allocationStatusFilter.addEventListener("change", () => { state.allocationStatus = allocationStatusFilter.value; reload(); });
  beneficiarySearch.addEventListener("input", () => { state.beneficiarySearch = beneficiarySearch.value; reload(); });

  container.querySelector("#exportCsvBtn").addEventListener("click", () => {
    if (!state.flatRows.length) { showToast("No rows to export.", "error"); return; }
    exportCSV("inventory_allocation_ui.csv", state.flatRows);
  });
}

export function destroy() {}
