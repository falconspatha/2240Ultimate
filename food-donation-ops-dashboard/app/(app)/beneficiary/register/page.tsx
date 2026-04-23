import PageHeader from "../../../../components/PageHeader";
import { createSelfBeneficiary } from "./actions";

export default function BeneficiaryRegisterPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Beneficiary Register" />
      <div className="card p-6">
        <p className="mb-4 text-sm text-slate-600">
          Submit your beneficiary profile. This role has form-only access and does not expose other beneficiary records.
        </p>
        <form className="grid gap-3 md:grid-cols-2" action={createSelfBeneficiary}>
          <input name="name" className="input" placeholder="Beneficiary name" required />
          <input name="contact" className="input" placeholder="Contact name" />
          <input name="phone" className="input" placeholder="Phone" />
          <input name="district" className="input" placeholder="District" />
          <input name="address" className="input md:col-span-2" placeholder="Address" />
          <input name="latitude" className="input" placeholder="Latitude (optional)" />
          <input name="longitude" className="input" placeholder="Longitude (optional)" />
          <select name="coldStorage" className="input">
            <option value="false">No cold storage</option>
            <option value="true">Has cold storage</option>
          </select>
          <button className="btn btn-primary md:col-span-2">Submit Registration</button>
        </form>
      </div>
    </div>
  );
}
