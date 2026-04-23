import Link from "next/link";
import PageHeader from "../../../../../components/PageHeader";
import { supabaseServer } from "../../../../../lib/supabase/server";

type ThankYouSearchParams = {
  donorId?: string;
  lotId?: string;
  productId?: string;
  qtyUnits?: string;
  unitWeightKg?: string;
  expiryDate?: string;
};

export default async function DonorDonationThankYouPage({
  searchParams,
}: {
  searchParams?: ThankYouSearchParams;
}) {
  const donorId = searchParams?.donorId || "-";
  const lotId = searchParams?.lotId || "-";
  const qtyUnits = searchParams?.qtyUnits || "-";
  const unitWeightKg = searchParams?.unitWeightKg || "-";
  const expiryDate = searchParams?.expiryDate || "-";
  const productId = searchParams?.productId || "";

  let productName = "Details unavailable";
  if (productId) {
    const supabase = supabaseServer();
    const { data } = await supabase.from("tblProduct").select("name").eq("ProductID", Number(productId)).single();
    productName = data?.name || "Details unavailable";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Thank You" />
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800">Donation submitted successfully</h2>
        <p className="mt-2 text-sm text-slate-600">Thank you for your contribution. Here are the details we recorded.</p>

        <div className="mt-4 grid gap-3 rounded-md border border-slate-200 p-4 text-sm md:grid-cols-2">
          <div>
            <span className="text-slate-500">Donor ID:</span> <span className="font-medium text-slate-800">{donorId}</span>
          </div>
          <div>
            <span className="text-slate-500">Lot ID:</span> <span className="font-medium text-slate-800">{lotId}</span>
          </div>
          <div>
            <span className="text-slate-500">Product:</span> <span className="font-medium text-slate-800">{productName}</span>
          </div>
          <div>
            <span className="text-slate-500">Quantity (units):</span> <span className="font-medium text-slate-800">{qtyUnits}</span>
          </div>
          <div>
            <span className="text-slate-500">Unit weight (kg):</span> <span className="font-medium text-slate-800">{unitWeightKg}</span>
          </div>
          <div>
            <span className="text-slate-500">Expiry date:</span> <span className="font-medium text-slate-800">{expiryDate}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/donor/donation" className="btn btn-primary">
            Submit Another Donation
          </Link>
          <Link href="/donor/register" className="btn btn-ghost">
            Back to Donor Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
