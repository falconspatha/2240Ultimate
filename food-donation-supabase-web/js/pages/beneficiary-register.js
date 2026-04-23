import { createBeneficiary } from "../services/api/beneficiaries.js";
import { formDataToObject, required } from "../ui/forms.js";
import { showToast } from "../ui/components.js";

const DISTRICTS = ["Hong Kong Island", "Kowloon", "New Territories"];

const SELF_BENEFICIARY_KEY = "fdms_self_beneficiary_id";

export async function render(container) {
  const beneficiaryId = localStorage.getItem(SELF_BENEFICIARY_KEY);

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Beneficiary Register</h3>
      </div>
      <p class="muted">Register your own organization profile. You can only submit your own details.</p>
      ${beneficiaryId ? `<p class="badge ok" style="margin-top:.8rem">Linked Beneficiary ID: ${beneficiaryId}</p>` : ""}
      <form id="beneficiarySelfForm" style="margin-top:1rem">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Beneficiary Name</th>
            <td style="border:none;padding-right:1.5rem"><input name="BeneficiaryName" required></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Contact Name</th>
            <td style="border:none"><input name="ContactName"></td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Phone</th>
            <td style="border:none;padding-right:1.5rem"><input name="Phone"></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">District</th>
            <td style="border:none">
              <select name="District" required>
                <option value="" selected disabled hidden>-- Select --</option>
                ${DISTRICTS.map((district) => `<option value="${district}">${district}</option>`).join("")}
              </select>
            </td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Address</th>
            <td style="border:none"><input name="Address"></td>
            <td colspan="2" style="border:none"></td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Latitude</th>
            <td style="border:none;padding-right:1.5rem"><input name="Latitude"></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Longitude</th>
            <td style="border:none"><input name="Longitude"></td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Has Cold Storage</th>
            <td style="border:none">
              <select name="HasColdStorage" required>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </td>
            <td colspan="2" style="border:none;text-align:right">
              <button class="btn btn-primary">Submit Registration</button>
            </td>
          </tr>
        </table>
      </form>
    </section>
  `;

  container.querySelector("#beneficiarySelfForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formDataToObject(event.currentTarget);
    if (!required(payload.BeneficiaryName)) return showToast("Beneficiary name is required.", "error");
    payload.HasColdStorage = payload.HasColdStorage === "true";

    try {
      const row = await createBeneficiary(payload);
      localStorage.setItem(SELF_BENEFICIARY_KEY, String(row.BeneficiaryID));
      showToast(`Registration submitted. Your Beneficiary ID is ${row.BeneficiaryID}.`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

export function destroy() {}
