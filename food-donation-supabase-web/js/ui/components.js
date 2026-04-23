export function showToast(message, type = "success") {
  const root = document.getElementById("toastRoot");
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "error" : ""}`;
  el.textContent = message;
  root.append(el);
  setTimeout(() => {
    el.remove();
  }, 3500);
}

export function confirmModal({ title, message, onConfirm }) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal">
        <h3>${title}</h3>
        <p class="muted">${message}</p>
        <div style="display:flex;justify-content:flex-end;gap:.5rem">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn btn-danger" data-confirm>Confirm</button>
        </div>
      </div>
    </div>
  `;
  root.querySelector("[data-close]")?.addEventListener("click", () => (root.innerHTML = ""));
  root.querySelector("[data-confirm]")?.addEventListener("click", async () => {
    await onConfirm();
    root.innerHTML = "";
  });
}

export function renderPagination({ page, size, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return `
    <div class="pagination">
      <button class="btn btn-ghost" data-page="${Math.max(1, page - 1)}">Prev</button>
      <span>${page} / ${pages}</span>
      <button class="btn btn-ghost" data-page="${Math.min(pages, page + 1)}">Next</button>
    </div>
  `;
}

export function bindPagination(container, onChange) {
  container.querySelectorAll("[data-page]").forEach((btn) =>
    btn.addEventListener("click", () => onChange(Number(btn.dataset.page))),
  );
}

export function skeletonRows(cols = 5, rows = 5) {
  const cells = "<td><div class='skeleton'></div></td>".repeat(cols);
  return new Array(rows).fill(`<tr>${cells}</tr>`).join("");
}

export function exportCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Render a sort <select> element.
 * @param {Array<{label:string, sort:string, sortDir:string}>} options
 * @param {{sort:string, sortDir:string}} queryState
 * @returns {string} HTML string
 */
export function renderSortSelect(options, queryState) {
  const opts = options
    .map(({ label, sort, sortDir, sort2, sortDir2 }) => {
      const val = `${sort}:${sortDir}`;
      const selected = queryState.sort === sort && queryState.sortDir === sortDir ? "selected" : "";
      const d2 = sort2 ? `data-sort2="${sort2}" data-sort-dir2="${sortDir2 ?? "asc"}"` : "";
      return `<option value="${val}" ${selected} ${d2}>${label}</option>`;
    })
    .join("");
  return `<select class="sort-select" aria-label="Sort by">${opts}</select>`;
}

/**
 * Bind the sort <select> inside container to update queryState and call onChange.
 * Supports optional sort2/sortDir2 from the selected option.
 * @param {Element} container
 * @param {object} queryState - mutated in place
 * @param {function} onChange - called after state update
 */
export function bindSortSelect(container, queryState, onChange) {
  const sel = container.querySelector(".sort-select");
  if (!sel) return;
  sel.addEventListener("change", () => {
    const [sort, sortDir] = sel.value.split(":");
    queryState.sort = sort;
    queryState.sortDir = sortDir;
    queryState.page = 1;
    // pick up sort2/sortDir2 from the selected option's data attributes
    const opt = sel.options[sel.selectedIndex];
    queryState.sort2 = opt?.dataset.sort2 || undefined;
    queryState.sortDir2 = opt?.dataset.sortDir2 || undefined;
    onChange();
  });
}
