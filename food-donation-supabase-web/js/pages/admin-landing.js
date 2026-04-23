export async function render(container) {
  container.innerHTML = `
    <section class="card">
      <h3>Admin Landing</h3>
      <p class="muted" style="margin-top:.5rem">
        Use this page as a quick guide for daily administration tasks.
      </p>
      <h4 style="margin-top:1rem">Functions you can use</h4>
      <ul style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Run controlled SQL and example report queries in Admin Workspace.</li>
        <li>Monitor overall operations from the Dashboard.</li>
        <li>Review trends and details from Reports.</li>
      </ul>
      <h4 style="margin-top:1rem">Usage flow</h4>
      <ol style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Open Admin Workspace for SQL/report tasks.</li>
        <li>Check Dashboard for current status.</li>
        <li>Use Reports for deeper analysis.</li>
      </ol>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="#/admin-workspace">Open Admin Workspace</a>
        <a class="btn btn-ghost" href="#/dashboard">Open Dashboard</a>
        <a class="btn btn-ghost" href="#/reports">Open Reports</a>
      </div>
    </section>
  `;
}

export function destroy() {}
