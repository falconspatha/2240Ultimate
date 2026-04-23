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
  const todayIso = new Date().toISOString().slice(0, 10);

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
      ${sectionShell("r5", "5) Expired Food Overview", `<button class="btn btn-ghost" id="csv5">CSV</button>`)}
    </div>`;

  let data1 = [], data2 = [], data3 = [], data4 = [], data5 = [];
  const pages = { r1: 1, r2: 1, r3: 1, r4: 1, r5: 1 };

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

  function renderExpiredOverview(rows) {
    const trendMap = new Map();
    let totalLots = 0;
    let totalUnits = 0;
    let totalKg = 0;

    rows.forEach((r) => {
      totalLots += 1;
      totalUnits += Number(r.QuantityUnits || 0);
      totalKg += Number(r.TotalKg || 0);

      const date = r.ExpiryDate || "";
      const current = trendMap.get(date) || { date, lots: 0, kg: 0 };
      current.lots += 1;
      current.kg += Number(r.TotalKg || 0);
      trendMap.set(date, current);
    });

    const trend = [...trendMap.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const maxKg = trend.reduce((max, item) => Math.max(max, item.kg), 0);

    const chartHtml = trend.length
      ? `<div class="card" style="padding:.75rem;margin-bottom:.75rem">
           <div style="font-size:.85rem;color:var(--muted);margin-bottom:.5rem">Daily expired trend (kg by expiry date)</div>
           <div style="display:flex;gap:.5rem;align-items:flex-end;overflow-x:auto;padding-bottom:.25rem">
             ${trend
               .map((item) => {
                 const h = maxKg > 0 ? Math.max(8, Math.round((item.kg / maxKg) * 100)) : 8;
                 const label = String(item.date || "").slice(5);
                 return `<div style="display:flex;flex-direction:column;align-items:center;min-width:48px">
                   <div style="font-size:.7rem;color:var(--muted)">${item.kg.toFixed(1)}</div>
                   <div style="width:22px;height:${h}px;border-radius:6px;background:#2563eb"></div>
                   <div style="font-size:.7rem;color:var(--muted)">${label}</div>
                 </div>`;
               })
               .join("")}
           </div>
         </div>`
      : `<div class="card" style="padding:.75rem;margin-bottom:.75rem"><span class="muted">No expired lots found.</span></div>`;

    const page = pages.r5;
    const start = (page - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);
    const body = slice
      .map(
        (r) =>
          `<tr><td>${r.ExpiryDate || ""}</td><td>${r.LotID || ""}</td><td>${r.ProductName || ""}</td><td>${r.DonorName || ""}</td><td>${r.Status || ""}</td><td>${r.QuantityUnits || 0}</td><td>${r.TotalKg.toFixed(2)}</td></tr>`,
      )
      .join("") || `<tr><td colspan="7" class="muted">No rows</td></tr>`;

    const el = container.querySelector(`[data-section='r5'] .section-body`);
    el.innerHTML = `
      <div class="card" style="padding:.75rem;margin-bottom:.75rem">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:.5rem">
          <div><small class="muted">Expired lots</small><div><strong>${totalLots}</strong></div></div>
          <div><small class="muted">Expired units</small><div><strong>${totalUnits}</strong></div></div>
          <div><small class="muted">Expired kg</small><div><strong>${totalKg.toFixed(2)}</strong></div></div>
        </div>
      </div>
      ${chartHtml}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Expiry</th><th>LotID</th><th>Product</th><th>Donor</th><th>Status</th><th>Units</th><th>kg</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <div id="pager-r5"></div>
    `;
    const pager = el.querySelector("#pager-r5");
    pager.innerHTML = renderPagination({ page, size: PAGE_SIZE, total: rows.length });
    bindPagination(pager, (p) => {
      pages.r5 = p;
      renderExpiredOverview(rows);
    });
  }

  async function loadExpiredOverview() {
    const { data, error } = await supabase
      .from("tblDonationLot")
      .select("LotID, ExpiryDate, QuantityUnits, UnitWeightKg, Status, tblProduct:ProductID(ProductName), tblDonor:DonorID(DonorName)")
      .lt("ExpiryDate", todayIso)
      .in("Status", ["Received", "Stored", "Allocated", "Picked"])
      .order("ExpiryDate", { ascending: true });
    if (error) throw error;
    data5 = (data || []).map((r) => {
      const units = Number(r.QuantityUnits || 0);
      const unitKg = Number(r.UnitWeightKg || 0);
      return {
        LotID: r.LotID,
        ExpiryDate: r.ExpiryDate,
        ProductName: r.tblProduct?.ProductName || "",
        DonorName: r.tblDonor?.DonorName || "",
        Status: r.Status,
        QuantityUnits: units,
        TotalKg: units * unitKg,
      };
    });
    pages.r5 = 1;
    renderExpiredOverview(data5);
  }

  try {
    await Promise.all([loadNearExpiry(), loadUtilization(), loadFulfillment(), loadExpiredOverview()]);
    await loadDonorContribution();
  } catch (err) {
    showToast(err.message, "error");
  }

  ["r1", "r2", "r3", "r4", "r5"].forEach((id) => applyCollapse(container, id, !!collapseState[id]));

  container.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      collapseState[id] = !collapseState[id];
      saveCollapse(collapseState);
      applyCollapse(container, id, collapseState[id]);
    });
  });

  container.querySelector("#expandAll").addEventListener("click", () => {
    ["r1", "r2", "r3", "r4", "r5"].forEach((id) => { collapseState[id] = false; applyCollapse(container, id, false); });
    saveCollapse(collapseState);
  });
  container.querySelector("#collapseAll").addEventListener("click", () => {
    ["r1", "r2", "r3", "r4", "r5"].forEach((id) => { collapseState[id] = true; applyCollapse(container, id, true); });
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
  container.querySelector("#csv5").addEventListener("click", () => exportCSV("expired_food_overview.csv", data5));
}

export function destroy() {}
