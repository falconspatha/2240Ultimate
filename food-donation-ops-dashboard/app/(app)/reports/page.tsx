import PageHeader from "../../../components/PageHeader";
import { supabaseServer } from "../../../lib/supabase/server";

export default async function ReportsPage() {
  const supabase = supabaseServer();
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [{ data: nearExpiry }, { data: zones }, { data: inventory }, { data: openOrders }, { data: orderLines }, { data: allocations }, { data: lots }, { data: donors }] =
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
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">2) Zone Utilization</summary>
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
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">3) Open Order Fulfillment</summary>
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
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">4) Donor Contribution</summary>
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
