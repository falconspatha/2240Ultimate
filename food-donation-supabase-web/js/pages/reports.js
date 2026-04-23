import { supabase } from "../services/supabaseClient.js";
import { bindPagination, exportCSV, renderPagination, showToast } from "../ui/components.js";

const PAGE_SIZE = 10;

const COLLAPSE_KEY = "fdms_report_panel_state";

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

function sectionShell(id, title, extraControls = "") {
  return `
    <section class="card" data-section="${id}">
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:.75rem">
          <button class="btn btn-ghost" data-toggle="${id}" style="font-size:.8rem;padding:.25rem .6rem">▼ Collapse</button>
          <h3 style="margin:0">${title}</h3>
        </div>
        <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">${extraControls}</div>
      </div>
      <div class="section-body"></div>
    </section>`;
}

export async function render(container) {
  const collapseState = loadCollapse();

  container.innerHTML = `
    <div class="page-grid">
      <section class="card">
        <div class="toolbar">
          <h3>Reports</h3>
          <div style="display:flex;gap:.4rem">
            <button class="btn btn-ghost" id="expandAll">Expand all</button>
            <button class="btn btn-ghost" id="collapseAll">Collapse all</button>
          </div>
        </div>
      </section>
      ${sectionShell("r1", "1) Near-Expiry Lots (7 days)", `<button class="btn btn-ghost" id="csv1">CSV</button>`)}
      ${sectionShell("r2", "2) Zone Utilization",          `<button class="btn btn-ghost" id="csv2">CSV</button>`)}
      ${sectionShell("r3", "3) Open Order Fulfillment",    `<button class="btn btn-ghost" id="csv3">CSV</button>`)}
      ${sectionShell("r4", "4) Donor Contribution Summary",
        `<input type="date" id="fromDate">
         <input type="date" id="toDate">
         <button class="btn btn-ghost" id="applyDate">Apply</button>
         <button class="btn btn-ghost" id="csv4">CSV</button>`)}
    </div>`;

  let data1 = [], data2 = [], data3 = [], data4 = [];
  const pages = { r1: 1, r2: 1, r3: 1, r4: 1 };

  function renderPaged(sectionId, rows, thead, renderRow) {
    const page = pages[sectionId];
    const total = rows.length;
    const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const body = slice.map(renderRow).join("") || `<tr><td colspan="${thead.split("<th>").length - 1}" class="muted">No rows</td></tr>`;
    const el = container.querySelector(`[data-section='${sectionId}'] .section-body`);
    el.innerHTML = `<div class="table-wrap"><table>${thead}<tbody>${body}</tbody></table></div><div id="pager-${sectionId}"></div>`;
    const pager = el.querySelector(`#pager-${sectionId}`);
    pager.innerHTML = renderPagination({ page, size: PAGE_SIZE, total });
    bindPagination(pager, (p) => { pages[sectionId] = p; renderPaged(sectionId, rows, thead, renderRow); });
  }

  async function loadNearExpiry() {
    const { data, error } = await supabase.rpc("fn_report_near_expiry", { p_days: 7 });
    if (error) throw error;
    data1 = data || [];
    pages.r1 = 1;
    renderPaged("r1", data1,
      `<thead><tr><th>LotID</th><th>Product</th><th>Donor</th><th>Expiry</th><th>Units</th></tr></thead>`,
      (r) => `<tr><td>${r.LotID}</td><td>${r.ProductName}</td><td>${r.DonorName}</td><td>${r.ExpiryDate}</td><td>${r.QuantityUnits}</td></tr>`
    );
  }

  async function loadUtilization() {
    const { data, error } = await supabase.rpc("fn_report_zone_utilization");
    if (error) throw error;
    data2 = (data || []).map((r) => ({
      ZoneID: r.ZoneID, ZoneName: r.ZoneName, CapacityKg: r.CapacityKg,
      UsedKg: Number(r.UsedKg), UtilizationPct: Number(r.UtilizationPct),
    }));
    pages.r2 = 1;
    renderPaged("r2", data2,
      `<thead><tr><th>Zone</th><th>Used</th><th>Capacity</th><th>Utilization</th></tr></thead>`,
      (r) => `<tr><td>${r.ZoneName}</td><td>${r.UsedKg}</td><td>${r.CapacityKg}</td>
        <td><div class="progress"><span style="width:${Math.min(100, r.UtilizationPct)}%"></span></div>
        <small>${r.UtilizationPct}%${r.UtilizationPct > 100 ? " OVER" : ""}</small></td></tr>`
    );
  }

  async function loadFulfillment() {
    const { data, error } = await supabase.rpc("fn_report_order_fulfillment");
    if (error) throw error;
    data3 = (data || []).map((r) => ({
      OrderLineID: r.OrderLineID, OrderID: r.OrderID,
      RequestedUnits: r.RequestedUnits, AllocatedUnits: r.AllocatedUnits,
      CompletionPct: Number(r.CompletionPct),
    }));
    pages.r3 = 1;
    renderPaged("r3", data3,
      `<thead><tr><th>OrderLine</th><th>Order</th><th>Requested</th><th>Allocated</th><th>Completion</th></tr></thead>`,
      (r) => `<tr><td>${r.OrderLineID}</td><td>${r.OrderID}</td><td>${r.RequestedUnits}</td><td>${r.AllocatedUnits}</td>
        <td><div class="progress"><span style="width:${Math.min(100, r.CompletionPct)}%"></span></div>
        <small>${r.CompletionPct}%</small></td></tr>`
    );
  }

  async function loadDonorContribution(from, to) {
    const { data, error } = await supabase.rpc("fn_report_donor_contribution", {
      p_from_date: from || null,
      p_to_date:   to   || null,
    });
    if (error) throw error;
    data4 = data || [];
    pages.r4 = 1;
    renderPaged("r4", data4,
      `<thead><tr><th>Donor</th><th>Total Units</th><th>Total kg</th></tr></thead>`,
      (r) => `<tr><td>${r.Donor_Name}</td><td>${r.Total_Units}</td><td>${r.Total_kg}</td></tr>`
    );
  }

  try {
    await Promise.all([loadNearExpiry(), loadUtilization(), loadFulfillment()]);
    await loadDonorContribution();
  } catch (err) {
    showToast(err.message, "error");
  }

  ["r1", "r2", "r3", "r4"].forEach((id) => applyCollapse(container, id, !!collapseState[id]));

  container.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      collapseState[id] = !collapseState[id];
      saveCollapse(collapseState);
      applyCollapse(container, id, collapseState[id]);
    });
  });

  container.querySelector("#expandAll").addEventListener("click", () => {
    ["r1", "r2", "r3", "r4"].forEach((id) => { collapseState[id] = false; applyCollapse(container, id, false); });
    saveCollapse(collapseState);
  });
  container.querySelector("#collapseAll").addEventListener("click", () => {
    ["r1", "r2", "r3", "r4"].forEach((id) => { collapseState[id] = true; applyCollapse(container, id, true); });
    saveCollapse(collapseState);
  });

  container.querySelector("#applyDate").addEventListener("click", async () => {
    try { await loadDonorContribution(container.querySelector("#fromDate").value, container.querySelector("#toDate").value); }
    catch (err) { showToast(err.message, "error"); }
  });

  container.querySelector("#csv1").addEventListener("click", () => exportCSV("near_expiry_lots.csv", data1));
  container.querySelector("#csv2").addEventListener("click", () => exportCSV("zone_utilization.csv", data2));
  container.querySelector("#csv3").addEventListener("click", () => exportCSV("order_fulfillment.csv", data3));
  container.querySelector("#csv4").addEventListener("click", () => exportCSV("donor_contribution.csv", data4));
}

export function destroy() {}
