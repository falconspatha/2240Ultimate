import { createBeneficiary, deleteBeneficiary, listBeneficiaries, updateBeneficiary } from "../services/api/beneficiaries.js";
import { bindPagination, bindSortSelect, confirmModal, renderPagination, renderSortSelect, showToast } from "../ui/components.js";
import { formDataToObject, required } from "../ui/forms.js";
import { store } from "../store.js";

const DISTRICT_OPTIONS = ["Hong Kong Island", "Kowloon", "New Territories"];

const SORT_OPTIONS = [
  { label: "Newest first", sort: "CreatedAt",       sortDir: "desc" },
  { label: "Oldest first", sort: "CreatedAt",       sortDir: "asc"  },
  { label: "Name A→Z",     sort: "BeneficiaryName", sortDir: "asc"  },
  { label: "Name Z→A",     sort: "BeneficiaryName", sortDir: "desc" },
];

let unsubSearch;

function fkErrorMessage(err) {
  if (err?.code === "23503") return "Cannot delete: this record is referenced by existing data (e.g. orders or inventory).";
  return err?.message || "Delete failed.";
}

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

function form(row = {}) {
  return `
    <form id="beneficiaryForm" class="form-grid">
      <label>Name<input name="BeneficiaryName" required value="${row.BeneficiaryName || ""}"></label>
      <label>Contact<input name="ContactName" required value="${row.ContactName || ""}"></label>
      <label>Phone<input name="Phone" required value="${row.Phone || ""}"></label>
      <label>District
        <select name="District" required>
          <option value="" disabled ${!row.District ? "selected" : ""} hidden>-- Select --</option>
          ${DISTRICT_OPTIONS.map((d) => `<option value="${d}" ${row.District === d ? "selected" : ""}>${d}</option>`).join("")}
        </select>
      </label>
      <label style="grid-column:1/-1">Address<input name="Address" value="${row.Address || ""}"></label>
      <label>Latitude<input name="Latitude" value="${row.Latitude || ""}"></label>
      <label>Longitude<input name="Longitude" value="${row.Longitude || ""}"></label>
      <label>Cold Storage
        <select name="HasColdStorage" required>
          <option value="" disabled ${row.HasColdStorage === undefined || row.HasColdStorage === null ? "selected" : ""} hidden>-- Select --</option>
          <option value="true" ${row.HasColdStorage === true ? "selected" : ""}>Yes</option>
          <option value="false" ${row.HasColdStorage === false ? "selected" : ""}>No</option>
        </select>
      </label>
      <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
    </form>
  `;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, filters: {}, sort: "CreatedAt", sortDir: "desc", page: 1 };

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Beneficiaries</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select id="districtFilter" aria-label="Filter by district">
            <option value="">All Districts</option>
            ${DISTRICT_OPTIONS.map((d) => `<option value="${d}">${d}</option>`).join("")}
          </select>
          <select id="coldFilter" aria-label="Filter by cold storage">
            <option value="">Cold: All</option>
            <option value="true">Cold: Yes</option>
            <option value="false">Cold: No</option>
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
          <button class="btn btn-primary" id="new">Create Beneficiary</button>
        </div>
      </div>
      <div class="table-wrap">
        <table><thead><tr><th>Name</th><th>Contact</th><th>District</th><th>Phone</th><th>Cold?</th><th>Map</th><th></th></tr></thead><tbody id="rows"></tbody></table>
      </div>
      <div id="pager"></div>
    </section>
  `;

  async function load() {
    const res = await listBeneficiaries({ search: queryState.search, page: queryState.page, size: 10, sort: queryState.sort, sortDir: queryState.sortDir, filters: queryState.filters });
    container.querySelector("#rows").innerHTML = res.rows
      .map((r) => {
        const mapLink = r.Latitude && r.Longitude ? `https://maps.google.com/?q=${r.Latitude},${r.Longitude}` : "";
        return `<tr>
          <td>${r.BeneficiaryName || ""}</td><td>${r.ContactName || ""}</td><td>${r.District || ""}</td><td>${r.Phone || ""}</td>
          <td>${r.HasColdStorage ? "Yes" : "No"}</td>
          <td>${mapLink ? `<a class="btn btn-ghost" href="${mapLink}" target="_blank" rel="noreferrer">Map</a>` : ""}</td>
          <td><button class="btn btn-ghost" data-edit="${r.BeneficiaryID}">Edit</button> <button class="btn btn-danger" data-del="${r.BeneficiaryID}">Delete</button></td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="7" class="muted">No beneficiaries found.</td></tr>`;

    const pager = container.querySelector("#pager");
    pager.innerHTML = renderPagination({ page: queryState.page, size: 10, total: res.total });
    bindPagination(pager, (p) => { queryState.page = p; load().catch((e) => showToast(e.message, "error")); });

    container.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = res.rows.find((x) => String(x.BeneficiaryID) === btn.dataset.edit);
        const m = modal(`<h3>Edit Beneficiary</h3>${form(row)}`);
        m.querySelector("#beneficiaryForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          payload.HasColdStorage = payload.HasColdStorage === "true";
          if (!required(payload.BeneficiaryName) || !required(payload.ContactName) || !required(payload.Phone)) return showToast("Name, Contact and Phone are required", "error");
          await updateBeneficiary(row.BeneficiaryID, payload);
          m.innerHTML = "";
          showToast("Beneficiary updated");
          load().catch(() => {});
        });
      }),
    );
    container.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Delete beneficiary?",
          message: "This cannot be undone.",
          onConfirm: async () => {
            try {
              await deleteBeneficiary(btn.dataset.del);
              showToast("Deleted");
              await load();
            } catch (err) {
              showToast(fkErrorMessage(err), "error");
            }
          },
        }),
      ),
    );
  }

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#districtFilter").addEventListener("change", (e) => {
    queryState.filters = { ...queryState.filters, District: e.target.value };
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#coldFilter").addEventListener("change", (e) => {
    const val = e.target.value;
    const filters = { ...queryState.filters };
    if (val === "") delete filters.HasColdStorage;
    else filters.HasColdStorage = val === "true";
    queryState.filters = filters;
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#new").addEventListener("click", () => {
    const m = modal(`<h3>Create Beneficiary</h3>${form()}`);
    m.querySelector("#beneficiaryForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      payload.HasColdStorage = payload.HasColdStorage === "true";
      if (!required(payload.BeneficiaryName) || !required(payload.ContactName) || !required(payload.Phone)) return showToast("Name, Contact and Phone are required", "error");
      await createBeneficiary(payload);
      m.innerHTML = "";
      showToast("Beneficiary created");
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

  load().catch((e) => showToast(e.message, "error"));
}

export function destroy() {
  if (unsubSearch) unsubSearch();
}
