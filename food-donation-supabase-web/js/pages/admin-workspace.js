import { showToast } from "../ui/components.js";
import { supabase } from "../services/supabaseClient.js";
import { store } from "../store.js";
import { EXAMPLE_QUERIES } from "../data/exampleQueries.js";

// ── System Status ────────────────────────────────────────────────────────────
async function fetchSummary() {
  const { data, error } = await supabase.rpc("fn_admin_summary");
  if (error) throw error;
  const s = Array.isArray(data) ? data[0] : data;

  const { data: zones, error: zErr } = await supabase.rpc("fn_dashboard_zone_utilization");
  if (zErr) throw zErr;

  const overCapZones = (zones || []).filter(
    (z) => z.CapacityKg && Number(z.UsedKg) / Number(z.CapacityKg) >= 0.9,
  );

  return {
    alerts: {
      nearExpiry:  Number(s.near_expiry_count),
      openOrders:  Number(s.pending_orders),
      overCapZones,
    },
  };
}

function renderAlerts({ nearExpiry, openOrders, overCapZones }) {
  const items = [];
  const lotClass = nearExpiry > 0 ? "warn" : "ok";
  items.push(`<button class="badge ${lotClass}" id="alertLots" style="cursor:pointer;border:none;font:inherit">⚠️ ${nearExpiry} lot${nearExpiry !== 1 ? "s" : ""} expiring within 7 days</button>`);
  const orderClass = openOrders > 0 ? "warn" : "ok";
  items.push(`<button class="badge ${orderClass}" id="alertOrders" style="cursor:pointer;border:none;font:inherit">📋 ${openOrders} order${openOrders !== 1 ? "s" : ""} pending</button>`);
  if (overCapZones.length > 0)
    items.push(`<span class="badge warn">🏭 ${overCapZones.map((z) => z.ZoneName).join(", ")} at ≥90% capacity</span>`);
  if (nearExpiry === 0 && openOrders === 0 && overCapZones.length === 0)
    items.push(`<span class="badge ok">✅ All systems normal</span>`);
  return `<div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center">${items.join("")}</div>`;
}

// ── DDL guard ────────────────────────────────────────────────────────────────
const DDL_RULES = [
  /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i,
  /^CREATE\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+/i,
  /^DROP\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s*;?$/i,
];

function isAllowedDDL(sql) {
  return DDL_RULES.some((rule) => rule.test(sql));
}

// ── Example queries ──────────────────────────────────────────────────────────
function formatNow() {
  return new Date().toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResultTable(rows) {
  const keys = Object.keys(rows[0]);
  const head = `<thead><tr>${keys.map((k) => `<th>${escapeHtml(k)}</th>`).join("")}</tr></thead>`;
  const body = rows
    .map(
      (row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(row[k] === null || row[k] === undefined ? "" : String(row[k]))}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

async function runSelectRpc(sql) {
  const first = await supabase.rpc("fn_admin_run_select", { p_sql: sql });
  if (!first.error) return first;
  const message = String(first.error.message || "");
  const code = String(first.error.code || "");
  const isSignatureCacheMiss =
    code === "PGRST202" &&
    message.includes("fn_admin_run_select") &&
    message.includes("(p_sql)");
  if (!isSignatureCacheMiss) return first;
  return supabase.rpc("fn_admin_run_select", { sql });
}

let clockTimer;

// ── Main render ──────────────────────────────────────────────────────────────
export async function render(container) {
  const exampleButtons = EXAMPLE_QUERIES.map(
    (q) =>
      `<button type="button" class="btn btn-ghost" style="justify-content:flex-start;text-align:left" data-example-id="${q.id}">${escapeHtml(q.label)}</button>`,
  ).join("");

  container.innerHTML = `
    <div class="page-grid">

      <!-- System Status -->
      <section class="card" id="alertsCard">
        <div class="toolbar" style="margin-bottom:.5rem">
          <h3>System Status</h3>
          <button class="btn btn-ghost" id="refreshAlerts" style="font-size:.82rem">↻ Refresh</button>
        </div>
        <div id="alertsBar"><span class="muted">Loading...</span></div>
      </section>

      <!-- Admin SQL Console -->
      <section class="card">
        <div class="toolbar" style="flex-wrap:wrap;gap:.75rem">
          <h3>Admin SQL Console (Controlled)</h3>
        </div>
        <p class="muted">DDL only below. Execution uses <code>fn_admin_run_sql</code> (admin JWT).</p>
        <form id="ddlForm" style="display:grid;gap:.75rem;margin-top:.8rem">
          <textarea id="ddlInput" rows="4" placeholder="ALTER TABLE &quot;tblDonor&quot; ADD COLUMN &quot;Extra&quot; TEXT;" style="width:100%;font-family:ui-monospace,monospace;font-size:.85rem"></textarea>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary" type="submit">Run DDL</button>
          </div>
        </form>
      </section>

      <!-- Example Report Queries -->
      <section class="card">
        <div class="toolbar" style="flex-wrap:wrap;gap:.75rem">
          <h3>Example report queries</h3>
          <span class="muted" id="adminClock" aria-live="polite"></span>
        </div>
        <p class="muted" style="margin-top:.5rem">
          Same examples as the <code>example query</code> folder (aligned to your schema). Load one, then run — read-only SELECTs use <code>fn_admin_run_select</code>.
          Apply <code>sql/fn_admin_run_select.sql</code> in Supabase if the button errors.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.45rem;margin-top:.75rem">
          ${exampleButtons}
        </div>
        <div id="exampleResultWrap" style="margin-top:1rem;max-height:min(480px,60vh);overflow:auto;border:1px solid var(--border);border-radius:8px;padding:.75rem">
          <p class="muted" id="exampleResultPlaceholder">Results appear here.</p>
          <div id="exampleResultTable" style="display:none"></div>
        </div>
        <label style="display:block;margin-top:1rem;font-weight:600">Query</label>
        <textarea id="exampleSql" rows="8" style="width:100%;margin-top:.35rem;font-family:ui-monospace,monospace;font-size:.85rem" placeholder="Choose an example above, or paste a single SELECT…"></textarea>
        <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:.65rem;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost" id="clearExampleResult">Clear results</button>
        </div>
      </section>

    </div>
  `;

  // ── System Status ──────────────────────────────────────────────────────────
  async function loadStatus() {
    try {
      const { alerts } = await fetchSummary();
      container.querySelector("#alertsBar").innerHTML = renderAlerts(alerts);
      container.querySelector("#alertLots")?.addEventListener("click", () => {
        store.contextLotsFilter = { expiryFilter: "active", sort: "ExpiryDate", sortDir: "asc" };
        location.hash = "#/lots";
      });
      container.querySelector("#alertOrders")?.addEventListener("click", () => {
        store.contextOrdersFilter = { status: "Pending" };
        location.hash = "#/orders-picking";
      });
    } catch (err) {
      container.querySelector("#alertsBar").innerHTML =
        `<span class="badge warn">Failed to load status: ${escapeHtml(err.message)}</span>`;
    }
  }

  await loadStatus();
  container.querySelector("#refreshAlerts").addEventListener("click", loadStatus);

  // ── Clock ──────────────────────────────────────────────────────────────────
  const clockEl = container.querySelector("#adminClock");
  const tick = () => { if (clockEl) clockEl.textContent = formatNow(); };
  tick();
  clockTimer = setInterval(tick, 1000);

  // ── Example queries ────────────────────────────────────────────────────────
  const exampleSql = container.querySelector("#exampleSql");
  const resultPlaceholder = container.querySelector("#exampleResultPlaceholder");
  const resultTable = container.querySelector("#exampleResultTable");

  function setExampleResult(html, isTable) {
    resultPlaceholder.style.display = isTable ? "none" : "";
    resultTable.style.display = isTable ? "block" : "none";
    if (isTable) resultTable.innerHTML = html;
    else resultPlaceholder.innerHTML = html;
  }

  async function executeExampleQuery(sqlText) {
    const sql = sqlText.trim();
    if (!sql) { showToast("Enter or load a query first.", "error"); return; }
    try {
      const { data, error } = await runSelectRpc(sql);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : data != null ? [data] : [];
      if (!rows.length) { setExampleResult('<p class="muted">No rows returned.</p>', false); return; }
      setExampleResult(renderResultTable(rows), true);
    } catch (error) {
      showToast(error.message || String(error), "error");
      setExampleResult(`<p class="muted">${escapeHtml(error.message || String(error))}</p>`, false);
    }
  }

  container.querySelectorAll("[data-example-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = EXAMPLE_QUERIES.find((q) => q.id === btn.dataset.exampleId);
      if (!item) return;
      exampleSql.value = item.sql;
      exampleSql.focus();
      showToast(`Loaded: ${item.label}`);
      await executeExampleQuery(item.sql);
    });
  });

  container.querySelector("#clearExampleResult").addEventListener("click", () => {
    resultTable.innerHTML = "";
    setExampleResult("Results appear here.", false);
  });

  // ── DDL console ────────────────────────────────────────────────────────────
  container.querySelector("#ddlForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const sql = container.querySelector("#ddlInput").value.trim();
    if (!sql) return showToast("SQL is required.", "error");
    if (!isAllowedDDL(sql)) {
      showToast("Only CREATE/ALTER/DROP TABLE statements are allowed.", "error");
      return;
    }
    try {
      const { error } = await supabase.rpc("fn_admin_run_sql", { p_sql: sql });
      if (error) throw error;
      showToast("Schema statement executed.");
      container.querySelector("#ddlInput").value = "";
    } catch (error) {
      showToast(`SQL execution failed: ${error.message}`, "error");
    }
  });
}

export function destroy() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = undefined;
  }
}
