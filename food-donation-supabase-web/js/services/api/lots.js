import { supabase } from "../supabaseClient.js";

export async function listLots({ search = "", filters = {}, sort = "ReceivedDate", sortDir = "desc", sort2, sortDir2, fromDate = "", toDate = "" } = {}) {
  const { data, error } = await supabase.rpc("fn_list_lots", {
    p_search:     search,
    p_product_id: filters.ProductID ? Number(filters.ProductID) : 0,
    p_from_date:  fromDate || null,
    p_to_date:    toDate   || null,
    p_sort:       sort,
    p_sort_dir:   sortDir,
    p_sort2:      sort2    || null,
    p_sort_dir2:  sortDir2 || "asc",
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    ...r,
    tblDonor:   { DonorName:   r.DonorName   },
    tblProduct: { ProductName: r.ProductName },
  }));
}

export async function receiveLot(payload) {
  // 1. Auto-select zone if not provided
  let zoneId = payload.StoredZoneID ? Number(payload.StoredZoneID) : null;
  if (!zoneId) {
    const qtyUnits     = Number(payload.QuantityUnits);
    const unitWeightKg = Number(payload.UnitWeightKg);
    const totalKg      = qtyUnits * unitWeightKg;
    const { data: zData, error: zErr } = await supabase.rpc("fn_pick_available_zone", {
      p_temp_requirement: payload.TempRequirement,
      p_incoming_kg:      totalKg,
    });
    if (zErr) throw zErr;
    zoneId = zData;
    if (!zoneId) throw new Error(`No storage zone available for temperature: ${payload.TempRequirement}`);
  }

  // 2. Generate lot code if not provided
  const receivedDate = payload.ReceivedDate || new Date().toISOString().slice(0, 10);
  let lotCode = payload.LotCode || null;
  if (!lotCode) {
    const { data: cData, error: cErr } = await supabase.rpc("fn_generate_lot_code", {
      p_received_date: receivedDate,
    });
    if (cErr) throw cErr;
    lotCode = cData;
  }

  // 3. Insert lot + inventory
  const { data, error } = await supabase.rpc("fn_receive_lot", {
    p_donor_id:         Number(payload.DonorID),
    p_product_id:       Number(payload.ProductID),
    p_lot_code:         lotCode,
    p_qty_units:        Number(payload.QuantityUnits),
    p_unit_weight_kg:   Number(payload.UnitWeightKg),
    p_expiry_date:      payload.ExpiryDate,
    p_received_date:    receivedDate,
    p_temp_requirement: payload.TempRequirement,
    p_stored_zone_id:   zoneId,
    p_status:           payload.Status || "Received",
    p_notes:            payload.Notes  || null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function putToZone({ lotId, zoneId, units }) {
  const { data, error } = await supabase.rpc("fn_put_to_zone", {
    p_lot_id:  Number(lotId),
    p_zone_id: Number(zoneId),
    p_units:   Number(units),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
