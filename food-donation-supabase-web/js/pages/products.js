import { createProduct, deleteProduct, listProducts, updateProduct } from "../services/api/products.js";
import { bindPagination, bindSortSelect, confirmModal, renderPagination, renderSortSelect, showToast, skeletonRows } from "../ui/components.js";
import { formDataToObject, nonNegativeNumber, required } from "../ui/forms.js";
import { store } from "../store.js";

const SORT_OPTIONS = [
  { label: "Name A→Z",        sort: "ProductName",  sortDir: "asc"  },
  { label: "Name Z→A",        sort: "ProductName",  sortDir: "desc" },
  { label: "Unit kg (light)",  sort: "UnitWeightKg", sortDir: "asc"  },
  { label: "Unit kg (heavy)",  sort: "UnitWeightKg", sortDir: "desc" },
];

const CATEGORY_OPTIONS = ["Bakery", "Beverage", "Dry Goods", "Meat", "Produce"];
const TEMP_OPTIONS     = ["Ambient", "Chilled", "Frozen"];

let unsubSearch;

function modal(content) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop"><div class="modal"><button class="modal-close" aria-label="Close" onclick="this.closest('.modal-backdrop').parentElement.innerHTML=''">&times;</button>${content}</div></div>`;
  return root;
}

function productForm(p = {}) {
  return `
    <form id="productForm" class="form-grid">
      <label>Name<input name="ProductName" required value="${p.ProductName || ""}"></label>
      <label>Category
        <select name="Category" required>
          <option value="" disabled ${!p.Category ? "selected" : ""} hidden>-- Select --</option>
          ${CATEGORY_OPTIONS.map((c) => `<option value="${c}" ${p.Category === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </label>
      <label>Unit Weight (kg)<input name="UnitWeightKg" type="number" step="0.001" min="0" required value="${p.UnitWeightKg || ""}"></label>
      <label>Temp Requirement
        <select name="TempRequirement" required>
          <option value="" disabled ${!p.TempRequirement ? "selected" : ""} hidden>-- Select --</option>
          ${TEMP_OPTIONS.map((t) => `<option value="${t}" ${p.TempRequirement === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <div style="grid-column:1/-1;display:flex;justify-content:flex-end"><button class="btn btn-primary">Save</button></div>
    </form>
  `;
}

export async function render(container) {
  const queryState = { search: store.globalSearch, filters: {}, sort: "ProductName", sortDir: "asc", page: 1 };

  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Products</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <select id="categoryFilter" aria-label="Filter by category">
            <option value="">All Categories</option>
            ${CATEGORY_OPTIONS.map((c) => `<option value="${c}">${c}</option>`).join("")}
          </select>
          <select id="tempFilter" aria-label="Filter by temperature">
            <option value="">All Temps</option>
            ${TEMP_OPTIONS.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          ${renderSortSelect(SORT_OPTIONS, queryState)}
          <button class="btn btn-primary" id="newProduct">Create Product</button>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Category</th><th>Unit kg</th><th>Temp</th><th></th></tr></thead><tbody id="rows">${skeletonRows(5)}</tbody></table></div>
      <div id="pager"></div>
    </section>
  `;

  async function load() {
    const res = await listProducts({ search: queryState.search, page: queryState.page, size: 10, sort: queryState.sort, sortDir: queryState.sortDir, filters: queryState.filters });
    container.querySelector("#rows").innerHTML = res.rows
      .map(
        (r) => `<tr><td>${r.ProductName || ""}</td><td>${r.Category || ""}</td><td>${r.UnitWeightKg || 0}</td><td>${r.TempRequirement || ""}</td>
        <td><button class="btn btn-ghost" data-edit="${r.ProductID}">Edit</button> <button class="btn btn-danger" data-del="${r.ProductID}">Delete</button></td></tr>`,
      )
      .join("") || `<tr><td colspan="5" class="muted">No products found.</td></tr>`;

    const pager = container.querySelector("#pager");
    pager.innerHTML = renderPagination({ page: queryState.page, size: 10, total: res.total });
    bindPagination(pager, (p) => { queryState.page = p; load().catch((e) => showToast(e.message, "error")); });

    container.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const row = res.rows.find((x) => String(x.ProductID) === btn.dataset.edit);
        const m = modal(`<h3>Edit Product</h3>${productForm(row)}`);
        m.querySelector("#productForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = formDataToObject(e.currentTarget);
          if (!required(payload.ProductName) || !nonNegativeNumber(payload.UnitWeightKg) || !required(payload.Category) || !required(payload.TempRequirement)) {
            return showToast("Check required fields", "error");
          }
          await updateProduct(row.ProductID, payload);
          m.innerHTML = "";
          showToast("Product updated");
          load().catch(() => {});
        });
      }),
    );

    container.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmModal({
          title: "Delete product?",
          message: "This cannot be undone.",
          onConfirm: async () => {
            try {
              await deleteProduct(btn.dataset.del);
              showToast("Deleted");
              await load();
            } catch (e) {
              if (e.code === "23503") {
                showToast("Cannot delete: this product is referenced by existing order lines.", "error");
              } else {
                showToast(e.message, "error");
              }
            }
          },
        }),
      ),
    );
  }

  bindSortSelect(container, queryState, () => load().catch((e) => showToast(e.message, "error")));

  container.querySelector("#categoryFilter").addEventListener("change", (e) => {
    queryState.filters = { ...queryState.filters, Category: e.target.value };
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#tempFilter").addEventListener("change", (e) => {
    queryState.filters = { ...queryState.filters, TempRequirement: e.target.value };
    queryState.page = 1;
    load().catch((err) => showToast(err.message, "error"));
  });

  container.querySelector("#newProduct").addEventListener("click", () => {
    const m = modal(`<h3>Create Product</h3>${productForm()}`);
    m.querySelector("#productForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = formDataToObject(e.currentTarget);
      if (!required(payload.ProductName) || !nonNegativeNumber(payload.UnitWeightKg) || !required(payload.Category) || !required(payload.TempRequirement)) {
        return showToast("Check required fields", "error");
      }
      await createProduct(payload);
      m.innerHTML = "";
      showToast("Product created");
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
