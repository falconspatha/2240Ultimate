export async function render(container) {
  container.innerHTML = `
    <section class="card">
      <h3>Donor Landing</h3>
      <p class="muted" style="margin-top:.5rem">
        Use this page to quickly understand how to register and submit donation lots.
      </p>
      <h4 style="margin-top:1rem">Functions you can use</h4>
      <ul style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Register your donor profile and store your linked Donor ID.</li>
        <li>Create donation submissions with one or more product lines.</li>
        <li>Set lot expiry and temperature requirements per line.</li>
      </ul>
      <h4 style="margin-top:1rem">Usage flow</h4>
      <ol style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Complete Donor Register first.</li>
        <li>Open Make Donation and add product lines.</li>
        <li>Submit donation lots and confirm save success.</li>
      </ol>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="#/donor-register">Open Donor Register</a>
        <a class="btn btn-ghost" href="#/donor-donation">Open Make Donation</a>
      </div>
    </section>
  `;
}

export function destroy() {}
