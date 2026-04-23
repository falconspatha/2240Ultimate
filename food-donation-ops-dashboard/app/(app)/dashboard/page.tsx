import KpiCard from "../../../components/KpiCard";
import PageHeader from "../../../components/PageHeader";
import { rpcKpiDashboard } from "../../../lib/services/rpc";

export default async function DashboardPage() {
  const kpi = await rpcKpiDashboard();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total on-hand (kg)" value={String(kpi?.total_on_hand_kg ?? 0)} />
        <KpiCard label="Total on-hand (units)" value={String(kpi?.total_on_hand_units ?? 0)} />
        <KpiCard label="Expiring within 7 days" value={String(kpi?.expiring_within_7d ?? 0)} />
        <KpiCard label="Pending orders" value={String(kpi?.pending_orders ?? 0)} />
      </div>
      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-600">Zone Usage</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Zone</th>
                <th className="py-2 text-left">Capacity kg</th>
                <th className="py-2 text-left">Used kg</th>
              </tr>
            </thead>
            <tbody>
              {(kpi?.zones_usage ?? []).map((zone: any) => (
                <tr key={zone.zone_id} className="border-t border-slate-100">
                  <td className="py-2">{zone.zone_name}</td>
                  <td className="py-2">{zone.capacity_kg}</td>
                  <td className="py-2">{zone.used_kg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
