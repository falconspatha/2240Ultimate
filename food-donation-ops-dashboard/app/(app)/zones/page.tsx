import PageHeader from "../../../components/PageHeader";
import { supabaseServer } from "../../../lib/supabase/server";
import { createZone, recalcZone } from "./actions";

export default async function ZonesPage() {
  const supabase = supabaseServer();
  const { data: zones } = await supabase.from("tblStorageZone").select("ZoneID, Zone_Name, Temp_Band, Capacity_kg");
  const { data: inv } = await supabase.from("tblInventory").select("ZoneID, On_Hand_kg");

  const usedByZone = new Map<number, number>();
  inv?.forEach((row) => {
    usedByZone.set(row.ZoneID, (usedByZone.get(row.ZoneID) || 0) + Number(row.On_Hand_kg || 0));
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Zones" />
      <div className="card p-4">
        <form className="grid gap-3 md:grid-cols-4" action={createZone}>
          <input name="name" className="input" placeholder="Zone name" required />
          <input name="tempBand" className="input" placeholder="Temp band" />
          <input name="capacityKg" className="input" type="number" step="0.01" placeholder="Capacity kg" required />
          <input name="notes" className="input" placeholder="Notes" />
          <button className="btn btn-primary md:col-span-4">Create Zone</button>
        </form>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2 text-left">Zone</th>
              <th className="py-2 text-left">Temp Band</th>
              <th className="py-2 text-left">Capacity kg</th>
              <th className="py-2 text-left">Used kg</th>
              <th className="py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {zones?.map((zone) => (
              <tr key={zone.ZoneID} className="border-t border-slate-100">
                <td className="py-2">{zone.Zone_Name}</td>
                <td className="py-2">{zone.Temp_Band}</td>
                <td className="py-2">{zone.Capacity_kg}</td>
                <td className="py-2">{(usedByZone.get(zone.ZoneID) || 0).toFixed(2)}</td>
                <td className="py-2">
                  <form action={recalcZone}>
                    <input type="hidden" name="zoneId" value={zone.ZoneID} />
                    <button className="btn btn-ghost">Recalc</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
