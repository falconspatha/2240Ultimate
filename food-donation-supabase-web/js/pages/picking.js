import { listOpenOrders, listOrderLines } from "../services/api/orders.js";
import { allocate, fefoCandidates, markPicked } from "../services/api/picks.js";
import { showToast } from "../ui/components.js";
import { parseNumber } from "../ui/forms.js";
import { store } from "../store.js";

export async function render(container) {
  container.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <h3>Picking & Allocation (FEFO)</h3>
        <select id="orderSelect"></select>
      </div>
      <div id="content" class="muted">Select an open order to start.</div>
    </section>
  `;

  const select = container.querySelector("#orderSelect");
  const orders = await listOpenOrders();
  select.innerHTML = `<option value="">Select order</option>${orders
    .map((o) => `<option value="${o.OrderID}" ${String(o.OrderID) === String(store.contextOrderId || "") ? "selected" : ""}>#${o.OrderID} - ${o.Status} (${o.Priority})</option>`)
    .join("")}`;

  async function loadOrder(orderId) {
    if (!orderId) {
      container.querySelector("#content").textContent = "Select an open order to start.";
      return;
    }
    const lines = await listOrderLines(orderId);
    const blocks = await Promise.all(
      lines.map(async (line) => {
        const candidates = await fefoCandidates(line.ProductID);
        return { line, candidates };
      }),
    );
    container.querySelector("#content").innerHTML = blocks
      .map(({ line, candidates }) => {
        const cHtml = candidates.length
          ? candidates
              .map(
                (c) => `<tr>
            <td>${c.LotID}</td><td>${c.ExpiryDate}</td><td>${c.inventory.OnHandUnits}</td>
            <td><input type="number" min="1" step="1" max="${c.inventory.OnHandUnits}" value="1" data-units="${line.OrderLineID}:${c.inventory.InventoryID}" style="width:80px"></td>
            <td><button class="btn btn-primary" data-alloc="${line.OrderLineID}:${c.inventory.InventoryID}">Allocate</button></td>
          </tr>`,
              )
              .join("")
          : `<tr><td colspan="5" class="muted">No inventory candidate.</td></tr>`;
        return `<article class="card" style="margin:.7rem 0">
          <h4>Line #${line.OrderLineID} - ${line.tblProduct?.ProductName || line.ProductID} (Requested: ${line.QtyUnits})</h4>
          <table><thead><tr><th>LotID</th><th>Expiry</th><th>Stock</th><th>Alloc units</th><th></th></tr></thead><tbody>${cHtml}</tbody></table>
        </article>`;
      })
      .join("");

    container.querySelectorAll("[data-alloc]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const [orderLineId, inventoryId] = btn.dataset.alloc.split(":");
        const input = container.querySelector(`[data-units="${btn.dataset.alloc}"]`);
        await allocate({ orderLineId, inventoryId, allocUnits: parseNumber(input.value) });
        showToast("Allocated with FEFO");
        await loadOrder(orderId);
      }),
    );

    const { supabase } = await import("../services/supabaseClient.js");
    const { data: allocations } = await supabase
      .from("tblPickAllocation")
      .select("AllocationID, OrderLineID, AllocUnits, PickedAt")
      .in("OrderLineID", lines.map((l) => l.OrderLineID));

    container.querySelector("#content").insertAdjacentHTML(
      "beforeend",
      `<article class="card"><h4>Current allocations</h4>
        <table><thead><tr><th>AllocationID</th><th>OrderLineID</th><th>Units</th><th>Picked At</th><th></th></tr></thead>
          <tbody>${(allocations || [])
            .map(
              (a) => `<tr><td>${a.AllocationID}</td><td>${a.OrderLineID}</td><td>${a.AllocUnits}</td><td>${a.PickedAt || "-"}</td>
              <td>${a.PickedAt ? "" : `<button class="btn btn-primary" data-pick="${a.AllocationID}">Mark Picked</button>`}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      </article>`,
    );

    container.querySelectorAll("[data-pick]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await markPicked(btn.dataset.pick);
        showToast("Marked picked");
        await loadOrder(orderId);
      }),
    );
  }

  select.addEventListener("change", () => {
    store.contextOrderId = select.value || null;
    loadOrder(select.value).catch((e) => showToast(e.message, "error"));
  });

  if (store.contextOrderId) {
    await loadOrder(store.contextOrderId);
  }
}

export function destroy() {}
