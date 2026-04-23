import { addOrderLine, createOrder } from "../services/api/orders.js";
import { listProducts } from "../services/api/products.js";
import { showToast } from "../ui/components.js";
import { parseNumber } from "../ui/forms.js";

const SELF_BENEFICIARY_KEY = "fdms_self_beneficiary_id";
const today = () => new Date().toISOString().slice(0, 10);

function lineRowTemplate(products) {
  return `
    <tr data-line-row style="outline:1px solid var(--border);border-radius:8px">
      <td style="border:none"><select name="ProductID" required>
        <option value="" selected disabled hidden>-- Select Food --</option>
        ${products.map((p) => `<option value="${p.ProductID}">${p.ProductName}</option>`).join("")}
      </select></td>
      <td style="border:none"><input name="QtyUnits" type="number" min="1" step="1" required></td>
      <td style="border:none"><input name="LineNotes" placeholder="Optional notes"></td>
      <td style="border:none"><button type="button" class="btn btn-ghost" data-remove-line>Remove</button></td>
    </tr>
  `;
}

export async function render(container) {
  const beneficiaryId = localStorage.getItem(SELF_BENEFICIARY_KEY);
  let products = [];
  try {
    const res = await listProducts({ page: 1, size: 300, sort: "ProductName", sortDir: "asc" });
    products = res.rows || [];
  } catch (error) {
    showToast(error.message, "error");
  }

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Beneficiary Order</h3>
      </div>
      <p class="muted">Create a food request order for your own beneficiary account only.</p>
      ${
        beneficiaryId
          ? `<p class="badge ok" style="margin-top:.8rem">Using Beneficiary ID: ${beneficiaryId}</p>`
          : `<p class="badge warn" style="margin-top:.8rem">Please complete Beneficiary Register before placing orders.</p>`
      }
      <form id="beneficiaryOrderForm" class="form-grid" style="margin-top:1rem">
        <input type="hidden" name="BeneficiaryID" value="${beneficiaryId || ""}">
        <input type="hidden" name="OrderDate" value="${today()}">
        <input type="hidden" name="Status" value="Pending">
        <input type="hidden" name="Priority" value="1">
        <label>Required Delivery Date<br><input name="RequiredDeliveryDate" type="date"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">
          <strong>Order Lines (same OrderID, multiple products)</strong>
          <button type="button" class="btn btn-ghost" id="addOrderLineBtn">Add Product Line</button>
        </div>
        <div style="grid-column:1/-1">
          <table style="width:100%;border:none">
            <thead>
              <tr>
                <th style="color:var(--text);font-weight:normal;border:none">Food Product</th>
                <th style="color:var(--text);font-weight:normal;border:none">Qty Units</th>
                <th style="color:var(--text);font-weight:normal;border:none">Notes</th>
                <th style="border:none"></th>
              </tr>
            </thead>
            <tbody id="orderLinesWrap">
              ${lineRowTemplate(products)}
            </tbody>
          </table>
        </div>
        <label style="grid-column:1/-1">Notes<br><input name="Notes" placeholder="Preferred delivery window or constraints"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end">
          <button class="btn btn-primary">Create Order</button>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector("#beneficiaryOrderForm");
  const linesWrap = container.querySelector("#orderLinesWrap");
  container.querySelector("#addOrderLineBtn").addEventListener("click", () => {
    linesWrap.insertAdjacentHTML("beforeend", lineRowTemplate(products));
  });
  linesWrap.addEventListener("click", (event) => {
    const target = event.target.closest("[data-remove-line]");
    if (!target) return;
    const rows = linesWrap.querySelectorAll("[data-line-row]");
    if (rows.length <= 1) {
      showToast("At least one product line is required.", "error");
      return;
    }
    target.closest("[data-line-row]")?.remove();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!beneficiaryId) {
      showToast("Beneficiary ID is auto-generated after registration. Please register first.", "error");
      return;
    }
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const beneficiaryIdValue = parseNumber(payload.BeneficiaryID);
    if (!beneficiaryIdValue) {
      showToast("Beneficiary ID is required.", "error");
      return;
    }
    const lineRows = [...linesWrap.querySelectorAll("[data-line-row]")];
    const lines = lineRows
      .map((row) => ({
        ProductID: parseNumber(row.querySelector("[name='ProductID']")?.value),
        QtyUnits: parseNumber(row.querySelector("[name='QtyUnits']")?.value),
        Notes: row.querySelector("[name='LineNotes']")?.value || null,
      }))
      .filter((line) => line.ProductID && line.QtyUnits);

    if (!lines.length) {
      showToast("At least one valid product line is required.", "error");
      return;
    }

    try {
      const created = await createOrder({
        BeneficiaryID: beneficiaryIdValue,
        OrderDate: payload.OrderDate || today(),
        RequiredDeliveryDate: payload.RequiredDeliveryDate || null,
        Status: payload.Status || "Pending",
        Priority: 1,
        Notes: payload.Notes || null,
      });
      await Promise.all(lines.map((line) => addOrderLine(created.OrderID, line)));
      showToast(`Order #${created.OrderID} created with ${lines.length} line(s).`);
      form.reset();
      linesWrap.innerHTML = lineRowTemplate(products);
      container.querySelector("[name='BeneficiaryID']").value = beneficiaryId;
      container.querySelector("[name='OrderDate']").value = today();
      container.querySelector("[name='Status']").value = "Pending";
      container.querySelector("[name='Priority']").value = "1";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

export function destroy() {}
