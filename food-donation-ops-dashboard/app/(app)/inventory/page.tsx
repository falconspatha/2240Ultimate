import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import { getNumber, getString, type SearchParams } from "../../../lib/searchParams";
import { rpcSearchInventory } from "../../../lib/services/rpc";

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const q = getString(searchParams, "q");
  const zone = getString(searchParams, "zone");
  const category = getString(searchParams, "category");
  const expiryBefore = getString(searchParams, "expiryBefore");
  const page = getNumber(searchParams, "page", 1);
  const pageSize = getNumber(searchParams, "pageSize", 20);
  const sort = getString(searchParams, "sort", "expiry");

  const result = await rpcSearchInventory({
    q,
    filters: { zone, category, expiryBefore },
    page,
    size: pageSize,
    sort,
  });

  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" />
      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <input name="q" defaultValue={q} className="input" placeholder="Search product/zone" />
          <input name="zone" defaultValue={zone} className="input" placeholder="Zone ID" />
          <input name="category" defaultValue={category} className="input" placeholder="Category" />
          <input name="expiryBefore" defaultValue={expiryBefore} className="input" type="date" />
          <select name="sort" defaultValue={sort} className="input">
            <option value="expiry">Expiry</option>
            <option value="zone">Zone</option>
            <option value="kg">Kg</option>
          </select>
          <button className="btn btn-primary md:col-span-5">Apply Filters</button>
        </form>
      </div>
      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 text-left">Inventory</th>
              <th className="py-2 text-left">Product</th>
              <th className="py-2 text-left">Category</th>
              <th className="py-2 text-left">Zone</th>
              <th className="py-2 text-left">Expiry</th>
              <th className="py-2 text-left">Units</th>
              <th className="py-2 text-left">Kg</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row: any) => (
              <tr key={row.inventory_id} className="border-t border-slate-100">
                <td className="py-2">{row.inventory_id}</td>
                <td className="py-2">{row.product_name}</td>
                <td className="py-2">{row.category}</td>
                <td className="py-2">{row.zone_name}</td>
                <td className="py-2">{row.expiry_date}</td>
                <td className="py-2">{row.on_hand_units}</td>
                <td className="py-2">{row.on_hand_kg}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} pageSize={pageSize} />
      </div>
    </div>
  );
}
