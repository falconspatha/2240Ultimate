function readParamsFromHash() {
  const hash = location.hash || "";
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

export async function render(container) {
  const params = readParamsFromHash();

  const donorId = params.get("donorId") || "Details unavailable";
  const lineCount = params.get("lineCount") || "Details unavailable";
  const totalUnits = params.get("totalUnits") || "Details unavailable";
  const totalKg = params.get("totalKg") || "Details unavailable";
  const expirySummary = params.get("expirySummary") || "Details unavailable";
  const lotStart = params.get("lotStart") || "Details unavailable";
  const lotEnd = params.get("lotEnd") || "Details unavailable";

  container.innerHTML = `
    <section class="card">
      <div class="toolbar"><h3>Thank You</h3></div>
      <p class="muted">Donation submitted successfully. Thank you for supporting food redistribution.</p>
      <div class="form-grid" style="margin-top:1rem;grid-template-columns:repeat(2,minmax(180px,1fr));gap:.75rem">
        <div><small class="muted">Donor ID</small><div><strong>${donorId}</strong></div></div>
        <div><small class="muted">Submitted lines</small><div><strong>${lineCount}</strong></div></div>
        <div><small class="muted">Total units</small><div><strong>${totalUnits}</strong></div></div>
        <div><small class="muted">Estimated total kg</small><div><strong>${totalKg}</strong></div></div>
        <div><small class="muted">Expiry range</small><div><strong>${expirySummary}</strong></div></div>
        <div><small class="muted">Lot ID range</small><div><strong>${lotStart} to ${lotEnd}</strong></div></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem">
        <button class="btn btn-ghost" id="thankYouBackToLanding">Back to Donor Landing</button>
        <button class="btn btn-primary" id="thankYouSubmitAnother">Submit Another Donation</button>
      </div>
    </section>
  `;

  container
    .querySelector("#thankYouBackToLanding")
    ?.addEventListener("click", () => {
      location.hash = "#/donor-landing";
    });
  container
    .querySelector("#thankYouSubmitAnother")
    ?.addEventListener("click", () => {
      location.hash = "#/donor-donation";
    });
}

export function destroy() {}
