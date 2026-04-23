import { listProducts } from "../services/api/products.js";
import { receiveLot } from "../services/api/lots.js";
import { formDataToObject, parseNumber, required, validateLotDates } from "../ui/forms.js";
import { showToast } from "../ui/components.js";

const SELF_DONOR_KEY = "fdms_self_donor_id";
const today = () => new Date().toISOString().slice(0, 10);
const TEMP_OPTIONS = ["Ambient", "Chilled", "Frozen"];

function lineRowTemplate(products) {
  return `
    <tr data-line-row style="outline:1px solid var(--border)">
      <td style="border:none">
        <select name="ProductID" required>
          <option value="" selected disabled hidden>-- Select --</option>
          ${products.map((product) => `<option value="${product.ProductID}">${product.ProductName}</option>`).join("")}
        </select>
      </td>
      <td style="border:none"><input name="QuantityUnits" type="number" min="1" step="1" required style="width:80px"></td>
      <td style="border:none"><input name="UnitWeightKg" type="number" min="0.01" step="0.01" required style="width:80px"></td>
      <td style="border:none"><input name="ExpiryDate" type="date" required></td>
      <td style="border:none">
        <select name="TempRequirement" required>
          <option value="" selected disabled hidden>-- Select --</option>
          ${TEMP_OPTIONS.map((temp) => `<option value="${temp}">${temp}</option>`).join("")}
        </select>
      </td>
      <td style="border:none"><input name="LineNotes" placeholder="Optional notes"></td>
      <td style="border:none"><button type="button" class="btn btn-ghost" data-remove-line>Remove</button></td>
    </tr>
  `;
}

export async function render(container) {
  let products = [];
  try {
    const res = await listProducts({ page: 1, size: 300 });
    products = res.rows || [];
  } catch (error) {
    showToast(error.message, "error");
  }

  const donorId = localStorage.getItem(SELF_DONOR_KEY);

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Make Donation</h3>
      </div>
      <p class="muted">Create a new donation lot entry (donorLot) for your donor account.</p>
      ${
        donorId
          ? `<p class="badge ok" style="margin-top:.8rem">Using Donor ID: ${donorId}</p>`
          : `<p class="badge warn" style="margin-top:.8rem">Please complete Donor Register before making donations.</p>`
      }
      <form id="donorDonationForm" class="form-grid" style="margin-top:1rem">
        <input type="hidden" name="DonorID" value="${donorId || ""}">
        <input type="hidden" name="ReceivedDate" value="${today()}">
        <input type="hidden" name="Status" value="Received">
        <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">
          <strong>Donation Lines (one submit creates multiple lots)</strong>
          <button type="button" class="btn btn-ghost" id="addDonationLineBtn">Add Product Line</button>
        </div>
        <div style="grid-column:1/-1">
          <table style="width:100%">
            <thead>
              <tr>
                <th style="color:var(--text);font-weight:normal;border:none">Product</th>
                <th style="color:var(--text);font-weight:normal;border:none">Qty Units</th>
                <th style="color:var(--text);font-weight:normal;border:none">Unit Weight kg</th>
                <th style="color:var(--text);font-weight:normal;border:none">Expiry Date</th>
                <th style="color:var(--text);font-weight:normal;border:none">Temp</th>
                <th style="color:var(--text);font-weight:normal;border:none">Notes</th>
                <th style="border:none"></th>
              </tr>
            </thead>
            <tbody id="donationLinesWrap">
              ${lineRowTemplate(products)}
            </tbody>
          </table>
        </div>
        <label style="grid-column:1/-1">General Notes<br><input name="Notes"></label>
        <div style="grid-column:1/-1;display:flex;justify-content:flex-end">
          <button class="btn btn-primary">Submit Donation Lot</button>
        </div>
      </form>
    </section>
  `;

  const form = container.querySelector("#donorDonationForm");
  const linesWrap = container.querySelector("#donationLinesWrap");
  container.querySelector("#addDonationLineBtn").addEventListener("click", () => {
    linesWrap.insertAdjacentHTML("beforeend", lineRowTemplate(products));
  });
  linesWrap.addEventListener("click", (event) => {
    const target = event.target.closest("[data-remove-line]");
    if (!target) return;
    const rows = linesWrap.querySelectorAll("[data-line-row]");
    if (rows.length <= 1) {
      showToast("At least one donation line is required.", "error");
      return;
    }
    target.closest("[data-line-row]")?.remove();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!donorId) {
      showToast("Donor ID is auto-generated after registration. Please register first.", "error");
      return;
    }
    const payload = formDataToObject(form);
    const rows = [...linesWrap.querySelectorAll("[data-line-row]")];
    const lines = rows
      .map((row) => ({
        ProductID: parseNumber(row.querySelector("[name='ProductID']")?.value),
        QuantityUnits: parseNumber(row.querySelector("[name='QuantityUnits']")?.value),
        UnitWeightKg: parseNumber(row.querySelector("[name='UnitWeightKg']")?.value),
        ExpiryDate: row.querySelector("[name='ExpiryDate']")?.value,
        TempRequirement: row.querySelector("[name='TempRequirement']")?.value,
        Notes: row.querySelector("[name='LineNotes']")?.value || null,
      }))
      .filter((line) => line.ProductID && line.QuantityUnits && line.UnitWeightKg && line.ExpiryDate && line.TempRequirement);
    if (!required(payload.DonorID) || !lines.length) return showToast("Donor and at least one valid line are required.", "error");
    if (lines.some((line) => !validateLotDates(today(), line.ExpiryDate))) return showToast("Expiry date must be after received date.", "error");

    try {
      const results = await Promise.all(
        lines.map((line) =>
          receiveLot({
            ...payload,
            DonorID: parseNumber(payload.DonorID),
            ProductID: line.ProductID,
            QuantityUnits: line.QuantityUnits,
            UnitWeightKg: line.UnitWeightKg,
            ExpiryDate: line.ExpiryDate,
            TempRequirement: line.TempRequirement,
            Notes: line.Notes || payload.Notes || null,
          }),
        ),
      );

      const lotIds = results
        .map((row) => Number(row?.LotID ?? row?.lot_id ?? row?.lotId ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)
        .sort((a, b) => a - b);
      const totalUnits = lines.reduce((sum, line) => sum + Number(line.QuantityUnits || 0), 0);
      const totalKg = lines.reduce((sum, line) => sum + Number(line.QuantityUnits || 0) * Number(line.UnitWeightKg || 0), 0);
      const expiryDates = lines.map((line) => line.ExpiryDate).filter(Boolean).sort();
      const expirySummary =
        expiryDates.length > 0 ? `${expiryDates[0]} to ${expiryDates[expiryDates.length - 1]}` : "Details unavailable";

      const params = new URLSearchParams({
        donorId: String(donorId),
        lineCount: String(lines.length),
        totalUnits: String(totalUnits),
        totalKg: totalKg.toFixed(2),
        expirySummary,
        lotStart: lotIds.length ? String(lotIds[0]) : "Details unavailable",
        lotEnd: lotIds.length ? String(lotIds[lotIds.length - 1]) : "Details unavailable",
      });
      location.hash = `#/donor-thank-you?${params.toString()}`;
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  linesWrap.addEventListener("change", (event) => {
    const productSelect = event.target.closest("[name='ProductID']");
    if (!productSelect) return;
    const row = productSelect.closest("[data-line-row]");
    const product = products.find((p) => String(p.ProductID) === productSelect.value);
    if (!product?.TempRequirement) return;
    const tempSelect = row?.querySelector("[name='TempRequirement']");
    const hasOption = [...(tempSelect?.options || [])].some((opt) => opt.value === product.TempRequirement);
    if (hasOption) tempSelect.value = product.TempRequirement;
  });
}

export function destroy() {}
