import PageHeader from "../../../components/PageHeader";
import { supabaseServer } from "../../../lib/supabase/server";

export default async function ReportsPage() {
  const supabase = supabaseServer();
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [
    { data: nearExpiry },
    { data: zones },
    { data: inventory },
    { data: openOrders },
    { data: orderLines },
    { data: allocations },
    { data: lots },
    { data: donors },
    { data: expiredLots },
  ] =
    await Promise.all([
      supabase
        .from("tblDonationLot")
        .select("LotID, Expiry_Date, Quantity_Units, Status, tblProduct:ProductID(name), tblDonor:DonorID(Name)")
        .gte("Expiry_Date", from)
        .lte("Expiry_Date", to)
        .in("Status", ["Received", "Stored"])
        .order("Expiry_Date", { ascending: true }),
      supabase.from("tblStorageZone").select("ZoneID, Zone_Name, Capacity_kg"),
      supabase.from("tblInventory").select("ZoneID, On_Hand_kg"),
      supabase.from("tblOrders").select("OrderID, Status").filter("Status", "not.in", '("Completed","Cancelled")'),
      supabase.from("tblOrderLine").select("OrderLineID, OrderID, Qty_Units"),
      supabase.from("tblPickAllocation").select("OrderLineID, Alloc_Units"),
      supabase.from("tblDonationLot").select("DonorID, Quantity_Units, Unit_Weight_kg"),
      supabase.from("tblDonor").select("DonorID, Name"),
      supabase
        .from("tblDonationLot")
        .select("LotID, Expiry_Date, Quantity_Units, Unit_Weight_kg, Status, tblProduct:ProductID(name), tblDonor:DonorID(Name)")
        .lt("Expiry_Date", from)
        .in("Status", ["Received", "Stored", "Allocated", "Picked"])
        .order("Expiry_Date", { ascending: true }),
    ]);

  const zoneUsage = (zones || []).map((zone) => {
    const usedKg = (inventory || [])
      .filter((row) => String(row.ZoneID) === String(zone.ZoneID))
      .reduce((sum, row) => sum + Number(row.On_Hand_kg || 0), 0);
    const capacityKg = Number(zone.Capacity_kg || 0);
    const utilizationPct = capacityKg > 0 ? Number(((usedKg / capacityKg) * 100).toFixed(2)) : 0;
    return { ...zone, usedKg: Number(usedKg.toFixed(2)), utilizationPct };
  });

  const openOrderIds = new Set((openOrders || []).map((row) => row.OrderID));
  const fulfillment = (orderLines || [])
    .filter((line) => openOrderIds.has(line.OrderID))
    .map((line) => {
      const allocated = (allocations || [])
        .filter((alloc) => String(alloc.OrderLineID) === String(line.OrderLineID))
        .reduce((sum, alloc) => sum + Number(alloc.Alloc_Units || 0), 0);
      const requested = Number(line.Qty_Units || 0);
      return {
        OrderLineID: line.OrderLineID,
        OrderID: line.OrderID,
        requested,
        allocated,
        completionPct: requested ? Number(((allocated / requested) * 100).toFixed(2)) : 0,
      };
    });

  const donorNames = new Map((donors || []).map((donor) => [donor.DonorID, donor.Name]));
  const donorContributionMap = new Map<number, { units: number; kg: number }>();
  (lots || []).forEach((lot) => {
    const donorId = Number(lot.DonorID || 0);
    const current = donorContributionMap.get(donorId) || { units: 0, kg: 0 };
    const units = Number(lot.Quantity_Units || 0);
    const kg = units * Number(lot.Unit_Weight_kg || 0);
    donorContributionMap.set(donorId, { units: current.units + units, kg: current.kg + kg });
  });
  const donorContribution = Array.from(donorContributionMap.entries()).map(([donorId, value]) => ({
    donorId,
    donorName: donorNames.get(donorId) || String(donorId),
    totalUnits: value.units,
    totalKg: Number(value.kg.toFixed(2)),
  }));

  const expiredRows = (expiredLots || []).map((row) => {
    const units = Number(row.Quantity_Units || 0);
    const kg = Number((units * Number(row.Unit_Weight_kg || 0)).toFixed(2));
    return { ...row, units, kg };
  });

  const expiredSummary = expiredRows.reduce(
    (acc, row) => ({
      totalLots: acc.totalLots + 1,
      totalUnits: acc.totalUnits + row.units,
      totalKg: Number((acc.totalKg + row.kg).toFixed(2)),
    }),
    { totalLots: 0, totalUnits: 0, totalKg: 0 },
  );

  const expiredTrendMap = new Map<string, { date: string; totalLots: number; totalUnits: number; totalKg: number }>();
  expiredRows.forEach((row) => {
    const date = row.Expiry_Date;
    const current = expiredTrendMap.get(date) || { date, totalLots: 0, totalUnits: 0, totalKg: 0 };
    expiredTrendMap.set(date, {
      date,
      totalLots: current.totalLots + 1,
      totalUnits: current.totalUnits + row.units,
      totalKg: Number((current.totalKg + row.kg).toFixed(2)),
    });
  });
  const expiredTrend = Array.from(expiredTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const maxExpiredKg = expiredTrend.reduce((max, row) => Math.max(max, row.totalKg), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">1) Near-Expiry Lots (7 days)</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Lot</th>
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-left">Donor</th>
                <th className="py-2 text-left">Expiry</th>
                <th className="py-2 text-left">Units</th>
              </tr>
            </thead>
            <tbody>
              {(nearExpiry || []).map((row) => (
                <tr key={row.LotID} className="border-t border-slate-100">
                  <td className="py-2">{row.LotID}</td>
                  <td className="py-2">{row.tblProduct?.name}</td>
                  <td className="py-2">{row.tblDonor?.Name}</td>
                  <td className="py-2">{row.Expiry_Date}</td>
                  <td className="py-2">{row.Quantity_Units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">2) Expired Food Overview</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Expired Lots</div>
            <div className="text-xl font-semibold text-slate-900">{expiredSummary.totalLots}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Expired Units</div>
            <div className="text-xl font-semibold text-slate-900">{expiredSummary.totalUnits}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Expired kg</div>
            <div className="text-xl font-semibold text-slate-900">{expiredSummary.totalKg}</div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 p-3">
          <div className="mb-2 text-xs font-medium text-slate-600">Daily expired trend (kg by expiry date)</div>
          {expiredTrend.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">No expired lots found.</div>
          ) : (
            <svg
              className="h-40 w-full min-w-[680px]"
              viewBox={`0 0 ${Math.max(expiredTrend.length * 46 + 30, 680)} 170`}
              role="img"
              aria-label="Daily expired food trend chart"
            >
              {expiredTrend.map((row, idx) => {
                const x = 30 + idx * 46;
                const barHeight = maxExpiredKg > 0 ? Math.round((row.totalKg / maxExpiredKg) * 100) : 0;
                const y = 120 - barHeight;
                return (
                  <g key={row.date}>
                    <rect x={x} y={y} width={24} height={barHeight} rx={4} fill="#2563eb" />
                    <text x={x + 12} y={136} textAnchor="middle" fontSize="10" fill="#475569">
                      {row.date.slice(5)}
                    </text>
                    <text x={x + 12} y={y - 4} textAnchor="middle" fontSize="10" fill="#0f172a">
                      {row.totalKg}
                    </text>
                  </g>
                );
              })}
              <line x1="20" y1="120" x2={Math.max(expiredTrend.length * 46 + 20, 670)} y2="120" stroke="#cbd5e1" />
            </svg>
          )}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Expiry</th>
                <th className="py-2 text-left">Lot</th>
                <th className="py-2 text-left">Product</th>
                <th className="py-2 text-left">Donor</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Units</th>
                <th className="py-2 text-left">kg</th>
              </tr>
            </thead>
            <tbody>
              {expiredRows.map((row) => (
                <tr key={`${row.LotID}-${row.Expiry_Date}`} className="border-t border-slate-100">
                  <td className="py-2">{row.Expiry_Date}</td>
                  <td className="py-2">{row.LotID}</td>
                  <td className="py-2">{row.tblProduct?.name}</td>
                  <td className="py-2">{row.tblDonor?.Name}</td>
                  <td className="py-2">{row.Status}</td>
                  <td className="py-2">{row.units}</td>
                  <td className="py-2">{row.kg}</td>
                </tr>
              ))}
              {expiredRows.length === 0 ? (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={7}>
                    No expired rows.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </details>

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">3) Zone Utilization</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Zone</th>
                <th className="py-2 text-left">Used (kg)</th>
                <th className="py-2 text-left">Capacity (kg)</th>
                <th className="py-2 text-left">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {zoneUsage.map((row) => (
                <tr key={row.ZoneID} className="border-t border-slate-100">
                  <td className="py-2">{row.Zone_Name}</td>
                  <td className="py-2">{row.usedKg}</td>
                  <td className="py-2">{row.Capacity_kg}</td>
                  <td className="py-2">{row.utilizationPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">4) Open Order Fulfillment</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Order Line</th>
                <th className="py-2 text-left">Order</th>
                <th className="py-2 text-left">Requested</th>
                <th className="py-2 text-left">Allocated</th>
                <th className="py-2 text-left">Completion</th>
              </tr>
            </thead>
            <tbody>
              {fulfillment.map((row) => (
                <tr key={row.OrderLineID} className="border-t border-slate-100">
                  <td className="py-2">{row.OrderLineID}</td>
                  <td className="py-2">{row.OrderID}</td>
                  <td className="py-2">{row.requested}</td>
                  <td className="py-2">{row.allocated}</td>
                  <td className="py-2">{row.completionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">5) Donor Contribution</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 text-left">Donor</th>
                <th className="py-2 text-left">Total Units</th>
                <th className="py-2 text-left">Total kg</th>
              </tr>
            </thead>
            <tbody>
              {donorContribution.map((row) => (
                <tr key={row.donorId} className="border-t border-slate-100">
                  <td className="py-2">{row.donorName}</td>
                  <td className="py-2">{row.totalUnits}</td>
                  <td className="py-2">{row.totalKg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
