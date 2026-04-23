import PageHeader from "../../../../components/PageHeader";
import { createSelfDonor } from "./actions";

export default function DonorRegisterPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Donor Register" />
      <div className="card p-6">
        <p className="mb-4 text-sm text-slate-600">Register your donor profile before creating donation lots.</p>
        <form className="grid gap-3 md:grid-cols-2" action={createSelfDonor}>
          <input name="name" className="input" placeholder="Donor name" required />
          <input name="type" className="input" placeholder="Donor type (Company/NGO/etc.)" />
          <input name="phone" className="input" placeholder="Phone" />
          <input name="district" className="input" placeholder="District" />
          <input name="address" className="input md:col-span-2" placeholder="Address" />
          <button className="btn btn-primary md:col-span-2">Submit Registration</button>
        </form>
      </div>
    </div>
  );
}
