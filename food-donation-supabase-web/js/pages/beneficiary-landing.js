export async function render(container) {
  container.innerHTML = `
    <section class="card">
      <h3>Beneficiary Landing</h3>
      <p class="muted" style="margin-top:.5rem">
        Start here to submit your organization profile and request food support.
      </p>
      <h4 style="margin-top:1rem">Functions you can use</h4>
      <ul style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Register your beneficiary profile and save your linked Beneficiary ID.</li>
        <li>Create orders with one or more product lines.</li>
        <li>Submit requests and confirm your order submission.</li>
      </ul>
      <h4 style="margin-top:1rem">Usage flow</h4>
      <ol style="margin:.5rem 0 0 1.2rem;display:grid;gap:.35rem">
        <li>Complete Beneficiary Register first.</li>
        <li>Go to Beneficiary Order and add product lines.</li>
        <li>Submit the order and review the submission result.</li>
      </ol>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem">
        <a class="btn btn-primary" href="#/beneficiary-register">Open Beneficiary Register</a>
        <a class="btn btn-ghost" href="#/beneficiary-order">Open Beneficiary Order</a>
      </div>
    </section>
  `;
}

export function destroy() {}
