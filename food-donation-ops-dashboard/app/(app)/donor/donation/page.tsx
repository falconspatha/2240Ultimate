import PageHeader from "../../../../components/PageHeader";
import { supabaseServer } from "../../../../lib/supabase/server";
import { createDonorLot } from "./actions";

export default async function DonorDonationPage({
  searchParams,
}: {
  searchParams?: { donorId?: string };
}) {
  const supabase = supabaseServer();
  const { data: products } = await supabase.from("tblProduct").select("ProductID, name").order("name");
  const { data: zones } = await supabase.from("tblStorageZone").select("ZoneID, Zone_Name").order("Zone_Name");
  const donorId = searchParams?.donorId || "";
  const canSubmit = Boolean(donorId);

  return (
    <div className="space-y-6">
      <PageHeader title="Make Donation" />
      <div className="card p-6">
        <p className="mb-4 text-sm text-slate-600">Submit a donation lot using your auto-generated donor ID.</p>
        {canSubmit ? (
          <p className="mb-4 text-xs text-slate-500">Using Donor ID: {donorId}</p>
        ) : (
          <p className="mb-4 text-xs text-amber-700">Register first to auto-generate your Donor ID.</p>
        )}
        <form className="grid gap-3 md:grid-cols-2" action={createDonorLot}>
          <input type="hidden" name="donorId" value={donorId} />
          <select name="productId" className="input" required>
            <option value="">Select product</option>
            {products?.map((p) => (
              <option key={p.ProductID} value={p.ProductID}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="quantityUnits" type="number" min="1" className="input" placeholder="Units" required />
          <input name="unitWeightKg" type="number" min="0.01" step="0.01" className="input" placeholder="Unit kg" required />
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
          <button className="btn btn-primary md:col-span-2" disabled={!canSubmit}>
            Create donorLot Entry
          </button>
        </form>
      </div>
    </div>
  );
}
