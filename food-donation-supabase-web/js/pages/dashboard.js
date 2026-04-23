import { supabase } from "../services/supabaseClient.js";
import { showToast } from "../ui/components.js";

function countUp(el, to) {
  const duration = 450;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / duration);
    el.textContent = Math.floor(to * p).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export async function render(container) {
  container.innerHTML = `
    <div class="page-grid">
      <section class="kpi-grid" id="kpi"></section>
      <section class="split">
        <article class="card"><h3>Near-expiry lots (7 days)</h3><div id="expiryChart" class="muted">Loading...</div></article>
        <article class="card"><h3>Zone utilization</h3><div id="zoneChart" class="muted">Loading...</div></article>
      </section>
    </div>
  `;

  try {
    const [{ data: summary, error: sErr }, { data: expiry, error: eErr }, { data: zones, error: zErr }] =
      await Promise.all([
        supabase.rpc("fn_dashboard_summary"),
        supabase.rpc("fn_dashboard_expiry_chart"),
        supabase.rpc("fn_dashboard_zone_utilization"),
      ]);
    if (sErr) throw sErr;
    if (eErr) throw eErr;
    if (zErr) throw zErr;

    const s = Array.isArray(summary) ? summary[0] : summary;
    const kpis = [
      ["Total donors",      Number(s.total_donors)],
      ["Active lots",       Number(s.active_lots)],
      ["On-hand kg",        Math.round(Number(s.on_hand_kg))],
      ["Open orders",       Number(s.open_orders)],
      ["Total allocations", Number(s.total_allocations)],
    ];
    document.getElementById("kpi").innerHTML = kpis
      .map(([label]) => `<article class="card card-animate"><p class="muted">${label}</p><h2 data-kpi>0</h2></article>`)
      .join("");
    [...document.querySelectorAll("[data-kpi]")].forEach((el, i) => countUp(el, kpis[i][1]));

    // Expiry chart — fill 7-day buckets
    const buckets = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + 8 * 3600000 + i * 86400000).toISOString().slice(0, 10);
      buckets.set(d, 0);
    }
    (expiry || []).forEach((r) => { if (buckets.has(r.ExpiryDate)) buckets.set(r.ExpiryDate, Number(r.lot_count)); });
    document.getElementById("expiryChart").innerHTML = [...buckets.entries()]
      .map(([d, c]) => `<div style="display:flex;gap:.4rem;align-items:center;margin:.25rem 0">
        <small>${d.slice(5)}</small>
        <div class="progress" style="flex:1"><span style="width:${Math.min(100, c * 20)}%"></span></div>
        <small>${c}</small></div>`)
      .join("");

    // Zone utilization chart
    document.getElementById("zoneChart").innerHTML = (zones || [])
      .map((z) => {
        const pct = z.CapacityKg ? (Number(z.UsedKg) / Number(z.CapacityKg)) * 100 : 0;
        return `<div style="margin:.35rem 0"><small>${z.ZoneName}</small>
          <div class="progress"><span style="width:${Math.min(100, pct)}%"></span></div>
          <small>${pct.toFixed(1)}%</small></div>`;
      }).join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

export function destroy() {}
