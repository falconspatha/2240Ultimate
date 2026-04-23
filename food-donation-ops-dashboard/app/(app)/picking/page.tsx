import PageHeader from "../../../components/PageHeader";
import { supabaseServer } from "../../../lib/supabase/server";
import { allocateOrder, markPicked } from "./actions";

export default async function PickingPage() {
  const supabase = supabaseServer();
  const { data: orders } = await supabase.from("tblOrders").select("OrderID, Status").order("OrderID", { ascending: false });
  const { data: allocations } = await supabase
    .from("tblPickAllocation")
    .select("AllocationID, OrderLineID, Alloc_Units, Picked");

  return (
    <div className="space-y-6">
      <PageHeader title="Picking Allocation (FIFO)" />
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3" action={allocateOrder}>
          <select name="orderId" className="input" required>
            <option value="">Select order</option>
            {orders?.map((o) => (
              <option key={o.OrderID} value={o.OrderID}>
                #{o.OrderID} ({o.Status})
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Auto Allocate FIFO</button>
        </form>
      </div>
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-600">Allocations</h3>
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 text-left">Allocation</th>
              <th className="py-2 text-left">OrderLine</th>
              <th className="py-2 text-left">Units</th>
              <th className="py-2 text-left">Picked</th>
              <th className="py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {allocations?.map((a) => (
              <tr key={a.AllocationID} className="border-t border-slate-100">
                <td className="py-2">{a.AllocationID}</td>
                <td className="py-2">{a.OrderLineID}</td>
                <td className="py-2">{a.Alloc_Units}</td>
                <td className="py-2">{a.Picked ? "Yes" : "No"}</td>
                <td className="py-2">
                  {!a.Picked && (
                    <form action={markPicked}>
                      <input type="hidden" name="allocationId" value={a.AllocationID} />
                      <button className="btn btn-ghost">Mark Picked</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
