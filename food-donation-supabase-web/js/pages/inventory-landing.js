export async function render(container) {
  container.innerHTML = `
    <section class="card">
      <h3>Inventory Staff Landing</h3>
      <p class="muted" style="margin-top:.5rem">
        Use this page as a quick guide for daily allocation work.
      </p>
      <h4 style="margin-top:1rem">Functions you can use</h4>
      <ul style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>View on-hand, allocated, and available units by product and donor.</li>
        <li>Check destination breakdown for each inventory row.</li>
        <li>Run FEFO allocation for pending demand lines.</li>
      </ul>
      <h4 style="margin-top:1rem">Usage flow</h4>
      <ol style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Open Inventory Allocation UI.</li>
        <li>Select a product and apply filters (optional).</li>
        <li>Open row detail and allocate FEFO where needed.</li>
      </ol>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="#/inventory-staff-ui">Open Inventory Allocation UI</a>
      </div>
    </section>
  `;
}

export function destroy() {}
