import { createDonor, deleteDonor, donorStats, listDonors, updateDonor } from "../services/api/donors.js";
import { bindPagination, bindSortSelect, confirmModal, renderPagination, renderSortSelect, showToast, skeletonRows } from "../ui/components.js";
import { formDataToObject, required } from "../ui/forms.js";
import { store } from "../store.js";

const DONOR_TYPE_OPTIONS = ["Farm", "Foundation", "Restaurant", "Social Enterprise", "Supermarket", "Wholesaler"];
const DISTRICT_OPTIONS   = ["Hong Kong Island", "Kowloon", "New Territories"];

const SORT_OPTIONS = [
  { label: "Newest first",  sort: "CreatedAt",  sortDir: "desc" },
  { label: "Oldest first",  sort: "CreatedAt",  sortDir: "asc"  },
  { label: "Name A→Z",      sort: "DonorName",  sortDir: "asc"  },
  { label: "Name Z→A",      sort: "DonorName",  sortDir: "desc" },
];

let unsubSearch;

function fkErrorMessage(err) {
  if (err?.code === "23503") return "Cannot delete: this record is referenced by existing data (e.g. lots, orders, or inventory).";
  return err?.message || "Delete failed.";
}

function donorForm(row = {}) {
  return `
    <form id="donorForm" class="form-grid">
      <label>Name<input name="DonorName" required value="${row.DonorName || ""}"></label>
      <label>Type
        <select name="DonorType" required>
          <option value="" disabled ${!row.DonorType ? "selected" : ""} hidden>-- Select --</option>
          ${DONOR_TYPE_OPTIONS.map((t) => `<option value="${t}" ${row.DonorType === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <label>Phone<input name="Phone" value="${row.Phone || ""}"></label>
      <label>District
        <select name="District" required>
          <option value="" disabled ${!row.District ? "selected" : ""} hidden>-- Select --</option>
          ${DISTRICT_OPTIONS.map((d) => `<option value="${d}" ${row.District === d ? "selected" : ""}>${d}</option>`).join("")}
        </select>
      </label>
      <label style="grid-column:1/-1">Email<input name="Email" type="email" value="${row.Email || ""}"></label>
      <label style="grid-column:1/-1">Address<input name="Address" required value="${row.Address || ""}"></label>
      <div style="grid-column:1/-1;display:flex;justify-content:flex-end;gap:.5rem">
        <button class="btn btn-primary" type="submit">Save</button>
      </div>
    </form>
  `;
}

function openModal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, filters: {}, sort: "CreatedAt", sortDir: "desc", page: 1 };

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Donors</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select id="donorTypeFilter" aria-label="Filter by donor type">
            <option value="">All Types</option>
            ${DONOR_TYPE_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          <select id="districtFilter" aria-label="Filter by district">
            <option value="">All Districts</option>
            ${DISTRICT_OPTIONS.map((d) => `<option value="${d}">${d}</option>`).join("")}
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
          <button class="btn btn-primary" id="newDonor">Create Donor</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>District</th><th>Phone</th><th>Created</th><th></th></tr></thead>
          <tbody id="donorRows">${skeletonRows(6)}</tbody>
        </table>
      </div>
      <div id="donorPager"></div>
    </section>
  `;

  async function load() {
    const res = await listDonors({ search: queryState.search, page: queryState.page, size: 10, sort: queryState.sort, sortDir: queryState.sortDir, filters: queryState.filters });
    const rowsEl = container.querySelector("#donorRows");
    rowsEl.innerHTML = res.rows
      .map(
        (d) => `<tr>
          <td>${d.DonorName || ""}</td><td>${d.DonorType || ""}</td><td>${d.District || ""}</td><td>${d.Phone || ""}</td>
          <td>${(d.CreatedAt || "").slice(0, 10)}</td>
          <td>
            <button class="btn btn-ghost" data-edit="${d.DonorID}">Edit</button>
            <button class="btn btn-danger" data-del="${d.DonorID}">Delete</button>
            <button class="btn btn-ghost" data-stats="${d.DonorID}">Stats</button>
          </td>
        </tr>`,
      )
      .join("") || `<tr><td colspan="6" class="muted">No donors found.</td></tr>`;

    const pager = container.querySelector("#donorPager");
    pager.innerHTML = renderPagination({ page: queryState.page, size: 10, total: res.total });
    bindPagination(pager, (next) => { queryState.page = next; load().catch((e) => showToast(e.message, "error")); });

    rowsEl.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = res.rows.find((r) => String(r.DonorID) === btn.dataset.edit);
        const modal = openModal(`<h3>Edit Donor</h3>${donorForm(row)}`);
        modal.querySelector("#donorForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          if (!required(payload.DonorName)) return showToast("Name is required", "error");
          await updateDonor(row.DonorID, payload);
          modal.innerHTML = "";
          showToast("Donor updated");
          load().catch(() => {});
        });
      }),
    );

    rowsEl.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Delete donor?",
          message: "This action cannot be undone.",
          onConfirm: async () => {
            try {
              await deleteDonor(btn.dataset.del);
              showToast("Donor deleted");
              await load();
            } catch (err) {
              showToast(fkErrorMessage(err), "error");
            }
          },
        }),
      ),
    );

    rowsEl.querySelectorAll("[data-stats]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const stats = await donorStats(btn.dataset.stats);
        showToast(`Units: ${stats.totalUnits}, Kg: ${stats.totalKg.toFixed(2)}`);
      }),
    );
  }

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#donorTypeFilter").addEventListener("change", (e) => {
    queryState.filters = { ...queryState.filters, DonorType: e.target.value };
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#districtFilter").addEventListener("change", (e) => {
    queryState.filters = { ...queryState.filters, District: e.target.value };
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#newDonor").addEventListener("click", () => {
    const modal = openModal(`<h3>Create Donor</h3>${donorForm()}`);
    modal.querySelector("#donorForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      if (!required(payload.DonorName)) return showToast("Name is required", "error");
      await createDonor(payload);
      modal.innerHTML = "";
      showToast("Donor created");
      load().catch(() => {});
    });
  });

  function onSearch(e) {
    queryState.search = e.detail ?? store.globalSearch;
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  }
  window.addEventListener("global-search", onSearch);
  unsubSearch = () => window.removeEventListener("global-search", onSearch);

  load().catch((error) => showToast(error.message, "error"));
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
