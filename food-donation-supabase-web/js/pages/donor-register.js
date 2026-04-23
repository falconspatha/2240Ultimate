import { createDonor } from "../services/api/donors.js";
import { formDataToObject, required } from "../ui/forms.js";
import { showToast } from "../ui/components.js";

const DONOR_TYPES = ["Individual", "Company", "NGO", "Community Group"];
const DISTRICTS = ["Hong Kong Island", "Kowloon", "New Territories"];
const SELF_DONOR_KEY = "fdms_self_donor_id";

export async function render(container) {
  const donorId = localStorage.getItem(SELF_DONOR_KEY);

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Donor Register</h3>
      </div>
      <p class="muted">Create your donor profile before submitting donation lots.</p>
      ${donorId ? `<p class="badge ok" style="margin-top:.8rem">Linked Donor ID: ${donorId}</p>` : ""}
      <form id="donorSelfForm" style="margin-top:1rem">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Donor Name</th>
            <td style="border:none;padding-right:1.5rem"><input name="DonorName" required></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Donor Type</th>
            <td style="border:none">
              <select name="DonorType" required>
                <option value="" selected disabled hidden>-- Select --</option>
                ${DONOR_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}
              </select>
            </td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">District</th>
            <td style="border:none;padding-right:1.5rem">
              <select name="District" required>
                <option value="" selected disabled hidden>-- Select --</option>
                ${DISTRICTS.map((district) => `<option value="${district}">${district}</option>`).join("")}
              </select>
            </td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Phone</th>
            <td style="border:none"><input name="Phone"></td>
          </tr>
          <tr>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Email</th>
            <td style="border:none;padding-right:1.5rem"><input name="Email" type="email"></td>
            <th style="border:none;font-weight:normal;text-align:left;padding-right:1rem;white-space:nowrap;width:1%;color:var(--text)">Address</th>
            <td style="border:none"><input name="Address"></td>
          </tr>
          <tr>
            <td colspan="4" style="border:none;text-align:right;padding-top:.5rem">
              <button class="btn btn-primary">Submit Registration</button>
            </td>
          </tr>
        </table>
      </form>
    </section>
  `;

  container.querySelector("#donorSelfForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formDataToObject(event.currentTarget);
    if (!required(payload.DonorName)) return showToast("Donor name is required.", "error");

    try {
      const row = await createDonor(payload);
      localStorage.setItem(SELF_DONOR_KEY, String(row.DonorID));
      showToast(`Donor registered. Your Donor ID is ${row.DonorID}.`);
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

export function destroy() {}
