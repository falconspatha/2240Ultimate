import PageHeader from "../../../../components/PageHeader";
import { supabaseServer } from "../../../../lib/supabase/server";
import { createBeneficiaryOrder } from "./actions";

export default async function BeneficiaryOrderPage({
  searchParams,
}: {
  searchParams?: { beneficiaryId?: string };
}) {
  const supabase = supabaseServer();
  const beneficiaryId = searchParams?.beneficiaryId || "";
  const canSubmit = Boolean(beneficiaryId);
  const orderDate = new Date().toISOString().slice(0, 10);
  const { data: products } = await supabase.from("tblProduct").select("ProductID, name").order("name");

  return (
    <div className="space-y-6">
      <PageHeader title="Beneficiary Order" />
      <div className="card p-6">
        <p className="mb-4 text-sm text-slate-600">Place a food request using your auto-generated beneficiary ID.</p>
        {canSubmit ? (
          <p className="mb-4 text-xs text-slate-500">Using Beneficiary ID: {beneficiaryId}</p>
        ) : (
          <p className="mb-4 text-xs text-amber-700">Register first to auto-generate your Beneficiary ID.</p>
        )}
        <form className="grid gap-3 md:grid-cols-2" action={createBeneficiaryOrder}>
          <input type="hidden" name="beneficiaryId" value={beneficiaryId} />
          <input type="hidden" name="orderDate" value={orderDate} />
          <input type="hidden" name="status" value="Pending" />
          <input type="hidden" name="priority" value="1" />
          <input name="requiredDeliveryDate" type="date" className="input" />
          <select name="productId" className="input" required>
            <option value="">Select food product</option>
            {products?.map((p) => (
              <option key={p.ProductID} value={p.ProductID}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="qtyUnits" type="number" min={1} className="input" placeholder="Qty units" required />
          <input name="lineNotes" className="input md:col-span-2" placeholder="Optional notes for selected food line" />
          <input name="notes" className="input md:col-span-2" placeholder="Items needed / delivery notes" />
          <button className="btn btn-primary md:col-span-2" disabled={!canSubmit}>
            Create Order
          </button>
        </form>
      </div>
    </div>
  );
}
