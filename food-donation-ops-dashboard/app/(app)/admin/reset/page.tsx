import PageHeader from "../../../../components/PageHeader";
import { requireAdmin } from "../../../../lib/auth";
import { resetGeneratedPages } from "../../../../lib/services/rpc";

async function ResetButton() {
  async function action(formData: FormData) {
    "use server";
    const confirm = formData.get("confirm");
    if (confirm !== "RESET") {
      throw new Error("Confirmation text mismatch.");
    }
    await resetGeneratedPages();
    console.log("Admin reset executed");
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-slate-600">
        This action deletes all user-generated dynamic pages and recreates defaults. Type <strong>RESET</strong>{" "}
        to continue.
      </p>
      <input name="confirm" className="input" placeholder="Type RESET to confirm" required />
      <button className="btn btn-primary">Reset Generated Pages</button>
    </form>
  );
}

export default async function ResetPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Reset" />
      <div className="card p-6">
        <ResetButton />
      </div>
    </div>
  );
}
