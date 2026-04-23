import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import { supabaseServer } from "../../../lib/supabase/server";
import { getNumber, getString, type SearchParams } from "../../../lib/searchParams";
import { createBeneficiary } from "./actions";

export default async function BeneficiariesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = supabaseServer();
  const q = getString(searchParams, "q");
  const page = getNumber(searchParams, "page", 1);
  const pageSize = getNumber(searchParams, "pageSize", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("tblBeneficiary")
    .select("BeneficiaryID, Beneficiary_Name, Contact_Name, Phone, District, Has_Cold_Storage", {
      count: "exact",
    })
    .range(from, to)
    .order("Created_At", { ascending: false });

  if (q) query = query.ilike("Beneficiary_Name", `%${q}%`);
  const { data: beneficiaries, count } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Beneficiaries" />
      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" action={createBeneficiary}>
          <input name="name" className="input" placeholder="Beneficiary name" required />
          <input name="contact" className="input" placeholder="Contact name" />
          <input name="phone" className="input" placeholder="Phone" />
          <input name="district" className="input" placeholder="District" />
          <input name="address" className="input md:col-span-2" placeholder="Address" />
          <select name="coldStorage" className="input">
            <option value="false">No cold storage</option>
            <option value="true">Has cold storage</option>
          </select>
          <button className="btn btn-primary md:col-span-4">Create Beneficiary</button>
        </form>
      </div>

      <div className="card p-4">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="input" placeholder="Search name" />
          <button className="btn btn-primary">Search</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Contact</th>
                <th className="py-2 text-left">Phone</th>
                <th className="py-2 text-left">District</th>
                <th className="py-2 text-left">Cold Storage</th>
              </tr>
            </thead>
            <tbody>
              {beneficiaries?.map((b) => (
                <tr key={b.BeneficiaryID} className="border-t border-slate-100">
                  <td className="py-2">{b.Beneficiary_Name}</td>
                  <td className="py-2">{b.Contact_Name}</td>
                  <td className="py-2">{b.Phone}</td>
                  <td className="py-2">{b.District}</td>
                  <td className="py-2">{b.Has_Cold_Storage ? "Yes" : "No"}</td>
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
