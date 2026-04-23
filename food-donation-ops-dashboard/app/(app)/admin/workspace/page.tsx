import Link from "next/link";
import PageHeader from "../../../../components/PageHeader";
import { executeAdminSql } from "../../../../lib/services/rpc";

const WORKSPACE_LINKS = [
  { href: "/donations", label: "Donations", description: "Manage donor lots and stock intake." },
  { href: "/inventory", label: "Inventory", description: "Review balances and adjustment tasks." },
  { href: "/orders", label: "Orders", description: "Create and monitor food requests." },
  { href: "/picking", label: "Picking", description: "Allocate and complete fulfillment picks." },
  { href: "/beneficiaries", label: "Beneficiaries", description: "Maintain beneficiary directory." },
  { href: "/zones", label: "Zones", description: "Maintain cold-chain/storage zone setup." },
  { href: "/reports", label: "Reports", description: "Review report blocks and KPIs." },
  { href: "/admin/reset", label: "Admin Reset", description: "Run protected reset operation." },
];

async function runSql(formData: FormData) {
  "use server";
  const sql = String(formData.get("sql") || "");
  await executeAdminSql(sql);
}

export default function AdminWorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Workspace" />

      <div className="card p-4">
        <p className="text-sm text-slate-600">
          Task-based admin workspace with full operational access. Use modules below instead of navigating table-by-table.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKSPACE_LINKS.map((item) => (
            <article key={item.href} className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold">{item.label}</h3>
              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              <Link href={item.href} className="btn btn-ghost mt-3">
                Open
              </Link>
            </article>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700">Admin SQL Console (Controlled)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Allowed statements: ALTER TABLE, CREATE TABLE, DROP TABLE. Every execution is logged to admin audit log.
        </p>
        <form className="mt-3 space-y-3" action={runSql}>
          <textarea
            name="sql"
            className="input min-h-28 w-full"
            placeholder="ALTER TABLE tblDonor ADD COLUMN Email TEXT;"
            required
          />
          <button className="btn btn-primary">Run SQL</button>
        </form>
      </div>
    </div>
  );
}
