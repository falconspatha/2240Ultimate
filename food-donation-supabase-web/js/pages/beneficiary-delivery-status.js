import { listBeneficiaryDeliveryStatus } from "../services/api/orders.js";
import { showToast } from "../ui/components.js";

const SELF_BENEFICIARY_KEY = "fdms_self_beneficiary_id";

function statusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed" || normalized === "delivered") return "ok";
  if (normalized === "cancelled") return "warn";
  return "";
}

function renderLines(lines) {
  if (!lines?.length) return `<p class="muted" style="margin:.5rem 0 0">No order lines found.</p>`;
  return `
    <div class="table-wrap" style="margin-top:.6rem">
      <table>
        <thead><tr><th>Product</th><th>Qty Units</th><th>Notes</th></tr></thead>
        <tbody>
          ${lines.map((line) => `
            <tr>
              <td>${line.tblProduct?.ProductName || `Product #${line.ProductID}`}</td>
              <td>${line.QtyUnits}</td>
              <td>${line.Notes || "-"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export async function render(container) {
  const beneficiaryId = localStorage.getItem(SELF_BENEFICIARY_KEY);
  if (!beneficiaryId) {
    container.innerHTML = `
      <section class="card">
        <h3>Delivery Status</h3>
        <p class="muted" style="margin-top:.5rem">You need a Beneficiary ID before tracking delivery status.</p>
        <div style="display:flex;justify-content:flex-end;margin-top:1rem">
          <a class="btn btn-primary" href="#/beneficiary-register">Go to Beneficiary Register</a>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Delivery Status</h3>
        <button id="refreshBtn" class="btn btn-ghost" type="button">Refresh</button>
      </div>
      <p class="muted" style="margin-top:.5rem">Track your submitted order statuses and requested items.</p>
      <p class="badge ok" style="margin-top:.75rem">Beneficiary ID: ${beneficiaryId}</p>
      <div id="deliveryStatusList" style="margin-top:1rem"><p class="muted">Loading...</p></div>
    </section>
  `;

  const listEl = container.querySelector("#deliveryStatusList");

  const load = async () => {
    try {
      const rows = await listBeneficiaryDeliveryStatus(beneficiaryId);
      if (!rows.length) {
        listEl.innerHTML = `<p class="muted">No orders found yet. Create an order first.</p>`;
        return;
      }
      listEl.innerHTML = rows.map((row) => `
        <article class="card" style="margin-top:.8rem">
          <div class="toolbar" style="align-items:flex-start;gap:.5rem;flex-wrap:wrap">
            <div>
              <strong>Order #${row.OrderID}</strong>
              <p class="muted" style="margin:.25rem 0 0">
                Order Date: ${row.OrderDate || "-"} | Required Delivery: ${row.RequiredDeliveryDate || "-"}
              </p>
            </div>
            <span class="badge ${statusBadgeClass(row.Status)}">${row.Status || "Pending"}</span>
          </div>
          <p class="muted" style="margin-top:.5rem">
            Priority: ${row.Priority ?? "-"} | Items: ${row.lineCount} | Total Units Requested: ${row.totalQtyUnits}
          </p>
          ${row.Notes ? `<p style="margin-top:.4rem"><strong>Order Notes:</strong> ${row.Notes}</p>` : ""}
          ${renderLines(row.lines)}
        </article>`).join("");
    } catch (error) {
      showToast(error.message || String(error), "error");
      listEl.innerHTML = `<p class="muted">${error.message || String(error)}</p>`;
    }
  };

  container.querySelector("#refreshBtn").addEventListener("click", load);
  await load();
}

export function destroy() {}
