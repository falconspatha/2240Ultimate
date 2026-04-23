import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import { supabaseServer } from "../../../lib/supabase/server";
import { getNumber, getString, type SearchParams } from "../../../lib/searchParams";
import { addOrderLine, createOrder, updateOrderStatus } from "./actions";

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = supabaseServer();
  const q = getString(searchParams, "q");
  const status = getString(searchParams, "status");
  const page = getNumber(searchParams, "page", 1);
  const pageSize = getNumber(searchParams, "pageSize", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("tblOrders")
    .select("OrderID, Status, Priority, Order_Date, tblBeneficiary:BeneficiaryID(Beneficiary_Name)", {
      count: "exact",
    })
    .range(from, to)
    .order("Order_Date", { ascending: false });

  if (status) query = query.eq("Status", status);
  if (q) query = query.or(`tblBeneficiary.Beneficiary_Name.ilike.%${q}%`);

  const { data: orders, count } = await query;
  const { data: beneficiaries } = await supabase.from("tblBeneficiary").select("BeneficiaryID, Beneficiary_Name");
  const { data: products } = await supabase.from("tblProduct").select("ProductID, name");

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" />

      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" action={createOrder}>
          <select name="beneficiaryId" className="input" required>
            <option value="">Beneficiary</option>
            {beneficiaries?.map((b) => (
              <option key={b.BeneficiaryID} value={b.BeneficiaryID}>
                {b.Beneficiary_Name}
              </option>
            ))}
          </select>
          <select name="priority" className="input" defaultValue="2">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
          <input name="notes" className="input" placeholder="Notes" />
          <button className="btn btn-primary">Create Order</button>
        </form>
      </div>

      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <input name="q" defaultValue={q} className="input" placeholder="Search beneficiary" />
          <input name="status" defaultValue={status} className="input" placeholder="Status" />
          <button className="btn btn-primary md:col-span-2">Filter</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Order</th>
                <th className="py-2 text-left">Beneficiary</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Priority</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.OrderID} className="border-t border-slate-100">
                  <td className="py-2">{order.OrderID}</td>
                  <td className="py-2">{order.tblBeneficiary?.Beneficiary_Name}</td>
                  <td className="py-2">{order.Status}</td>
                  <td className="py-2">{order.Priority}</td>
                  <td className="py-2">{order.Order_Date?.slice(0, 10)}</td>
                  <td className="py-2">
                    <form action={updateOrderStatus} className="flex items-center gap-2">
                      <input type="hidden" name="orderId" value={order.OrderID} />
                      <select name="status" className="input" defaultValue={order.Status ?? "Pending"}>
                        <option value="Pending">Pending</option>
                        <option value="Allocated">Allocated</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button className="btn btn-ghost">Update</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={count ?? 0} pageSize={pageSize} />
      </div>

      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" action={addOrderLine}>
          <select name="orderId" className="input" required>
            <option value="">Order</option>
            {orders?.map((o) => (
              <option key={o.OrderID} value={o.OrderID}>
                #{o.OrderID}
              </option>
            ))}
          </select>
          <select name="productId" className="input" required>
            <option value="">Product</option>
            {products?.map((p) => (
              <option key={p.ProductID} value={p.ProductID}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="qtyUnits" className="input" type="number" min="1" required placeholder="Units" />
          <input name="notes" className="input" placeholder="Notes" />
          <button className="btn btn-primary md:col-span-4">Add Order Line</button>
        </form>
      </div>
    </div>
  );
}
