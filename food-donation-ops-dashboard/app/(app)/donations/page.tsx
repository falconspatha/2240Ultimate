import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import { supabaseServer } from "../../../lib/supabase/server";
import { getNumber, getString, type SearchParams } from "../../../lib/searchParams";
import { createDonationLot } from "./actions";

export default async function DonationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = supabaseServer();
  const q = getString(searchParams, "q");
  const status = getString(searchParams, "status");
  const page = getNumber(searchParams, "page", 1);
  const pageSize = getNumber(searchParams, "pageSize", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("tblDonationLot")
    .select(
      "LotID, Quantity_Units, Unit_Weight_kg, Expiry_Date, Received_Date, Status, tblDonor:DonorID(Name), tblProduct:ProductID(name), tblStorageZone:StoredZoneID(Zone_Name)",
      { count: "exact" },
    )
    .range(from, to)
    .order("Received_Date", { ascending: false });

  if (status) query = query.eq("Status", status);
  if (q) query = query.or(`tblDonor.Name.ilike.%${q}%,tblProduct.name.ilike.%${q}%`);

  const { data: lots, count } = await query;
  const { data: donors } = await supabase.from("tblDonor").select("DonorID, Name").order("Name");
  const { data: products } = await supabase.from("tblProduct").select("ProductID, name").order("name");
  const { data: zones } = await supabase.from("tblStorageZone").select("ZoneID, Zone_Name").order("Zone_Name");

  return (
    <div className="space-y-6">
      <PageHeader title="Donations" />
      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" action={createDonationLot}>
          <select name="donorId" className="input" required>
            <option value="">Select donor</option>
            {donors?.map((d) => (
              <option key={d.DonorID} value={d.DonorID}>
                {d.Name}
              </option>
            ))}
          </select>
          <select name="productId" className="input" required>
            <option value="">Select product</option>
            {products?.map((p) => (
              <option key={p.ProductID} value={p.ProductID}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="quantityUnits" type="number" min="1" className="input" placeholder="Units" required />
          <input name="unitWeightKg" type="number" step="0.01" className="input" placeholder="Unit kg" required />
          <input name="expiryDate" type="date" className="input" required />
          <select name="zoneId" className="input" required>
            <option value="">Zone</option>
            {zones?.map((z) => (
              <option key={z.ZoneID} value={z.ZoneID}>
                {z.Zone_Name}
              </option>
            ))}
          </select>
          <input name="tempRequirement" className="input" placeholder="Temp requirement" />
          <input name="notes" className="input" placeholder="Notes" />
          <button className="btn btn-primary md:col-span-4">Create Donation Lot</button>
        </form>
      </div>

      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <input name="q" defaultValue={q} className="input" placeholder="Search donor or product" />
          <input name="status" defaultValue={status} className="input" placeholder="Status" />
          <button className="btn btn-ghost">Filter</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Lot</th>
                <th className="py-2 text-left">Donor</th>
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-left">Units</th>
                <th className="py-2 text-left">Expiry</th>
                <th className="py-2 text-left">Zone</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {lots?.map((lot) => (
                <tr key={lot.LotID} className="border-t border-slate-100">
                  <td className="py-2">{lot.LotID}</td>
                  <td className="py-2">{lot.tblDonor?.Name}</td>
                  <td className="py-2">{lot.tblProduct?.name}</td>
                  <td className="py-2">{lot.Quantity_Units}</td>
                  <td className="py-2">{lot.Expiry_Date}</td>
                  <td className="py-2">{lot.tblStorageZone?.Zone_Name ?? "-"}</td>
                  <td className="py-2">{lot.Status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={count ?? 0} pageSize={pageSize} />
      </div>
    </div>
  );
}
