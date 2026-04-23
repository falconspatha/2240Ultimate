import { supabase } from "../supabaseClient.js";

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseTextNumeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return 0;
  return Number(value);
}

// Split large .in() queries into batches to avoid 502 from URL length limits
async function inBatches(table, selectStr, column, ids, batchSize = 10) {
  if (!ids.length) return [];
  const results = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data, error } = await supabase.from(table).select(selectStr).in(column, batch);
    if (error) throw error;
    results.push(...(data || []));
  }
  return results;
}

export async function listProductOptionsWithTotals({ search = "" } = {}) {
  const [{ data: products, error: productError }, { data: lots, error: lotError }, { data: inventory, error: invError }] = await Promise.all([
    supabase.from("tblProduct").select("ProductID, ProductName, Category, TempRequirement").order("ProductName", { ascending: true }),
    supabase.from("tblDonationLot").select("LotID, ProductID"),
    supabase.from("tblInventory").select("InventoryID, LotID, OnHandUnits, OnHandKg"),
  ]);
  if (productError || lotError || invError) throw productError || lotError || invError;

  const productByLot = new Map((lots || []).map((lot) => [String(lot.LotID), lot.ProductID]));
  const totals = new Map();
  (inventory || []).forEach((row) => {
    const productId = productByLot.get(String(row.LotID));
    if (!productId) return;
    const current = totals.get(productId) || { onHandUnits: 0, onHandKg: 0 };
    current.onHandUnits += parseTextNumeric(row.OnHandUnits);
    current.onHandKg += parseTextNumeric(row.OnHandKg);
    totals.set(productId, current);
  });

  const term = search.trim().toLowerCase();
  return (products || [])
    .filter((p) => !term || p.ProductName.toLowerCase().includes(term))
    .map((p) => ({
      ProductID: p.ProductID,
      ProductName: p.ProductName,
      Category: p.Category,
      TempRequirement: p.TempRequirement,
      OnHandUnits: Number((totals.get(p.ProductID)?.onHandUnits || 0).toFixed(2)),
      OnHandKg: Number((totals.get(p.ProductID)?.onHandKg || 0).toFixed(2)),
    }));
}

export async function listAllocationRowsByProduct(productId, { donorId = "", zoneId = "", allocationStatus = "all", beneficiarySearch = "" } = {}) {
  if (!productId) return { groups: [], summary: null, flatRows: [] };

  let lotQuery = supabase
    .from("tblDonationLot")
    .select("LotID, DonorID, ProductID, LotCode, ExpiryDate, ReceivedDate, TempRequirement, Status, tblDonor:DonorID(DonorName)")
    .eq("ProductID", productId);
  if (donorId) lotQuery = lotQuery.eq("DonorID", donorId);
  const { data: lots, error: lotError } = await lotQuery;
  if (lotError) throw lotError;
  if (!lots?.length) return { groups: [], summary: null, flatRows: [] };

  const lotById = new Map((lots || []).map((lot) => [String(lot.LotID), lot]));
  const lotIds = lots.map((lot) => lot.LotID);

  let invQuery = supabase
    .from("tblInventory")
    .select("InventoryID, LotID, ZoneID, OnHandUnits, OnHandKg, LastUpdated, tblStorageZone:ZoneID(ZoneName)")
    .in("LotID", lotIds);
  if (zoneId) invQuery = invQuery.eq("ZoneID", zoneId);
  const { data: inventoryRows, error: invError } = await invQuery;
  if (invError) throw invError;
  if (!inventoryRows?.length) return { groups: [], summary: null, flatRows: [] };

  const inventoryIds = inventoryRows.map((row) => row.InventoryID);
  const { data: allocations, error: allocError } = await supabase
    .from("tblPickAllocation")
    .select("AllocationID, InventoryID, OrderLineID, AllocUnits, AllocKg, PickedAt, FEFOSeq")
    .in("InventoryID", inventoryIds);
  if (allocError) throw allocError;

  const orderLineIds = [...new Set((allocations || []).map((a) => a.OrderLineID))];
  const { data: orderLines, error: lineError } = orderLineIds.length
    ? await supabase.from("tblOrderLine").select("OrderLineID, OrderID, ProductID, QtyUnits").in("OrderLineID", orderLineIds)
    : { data: [], error: null };
  if (lineError) throw lineError;

  const orderIds = [...new Set((orderLines || []).map((l) => l.OrderID))];
  const { data: orders, error: orderError } = orderIds.length
    ? await supabase.from("tblOrders").select("OrderID, BeneficiaryID, Status, Priority").in("OrderID", orderIds)
    : { data: [], error: null };
  if (orderError) throw orderError;

  const beneficiaryIds = [...new Set((orders || []).map((o) => o.BeneficiaryID))];
  const { data: beneficiaries, error: benError } = beneficiaryIds.length
    ? await supabase.from("tblBeneficiary").select("BeneficiaryID, BeneficiaryName").in("BeneficiaryID", beneficiaryIds)
    : { data: [], error: null };
  if (benError) throw benError;

  const lineById = new Map((orderLines || []).map((line) => [String(line.OrderLineID), line]));
  const orderById = new Map((orders || []).map((order) => [String(order.OrderID), order]));
  const beneficiaryById = new Map((beneficiaries || []).map((b) => [String(b.BeneficiaryID), b]));
  const allocationsByInventory = new Map();
  (allocations || []).forEach((alloc) => {
    const key = String(alloc.InventoryID);
    const arr = allocationsByInventory.get(key) || [];
    arr.push(alloc);
    allocationsByInventory.set(key, arr);
  });

  const term = beneficiarySearch.trim().toLowerCase();
  const flatRows = [];
  (inventoryRows || []).forEach((inv) => {
    const lot = lotById.get(String(inv.LotID));
    if (!lot) return;
    const allocs = allocationsByInventory.get(String(inv.InventoryID)) || [];
    const allocatedUnits = allocs.reduce((sum, row) => sum + asNumber(row.AllocUnits), 0);
    const allocatedKg = allocs.reduce((sum, row) => sum + asNumber(row.AllocKg), 0);
    const onHandUnits = parseTextNumeric(inv.OnHandUnits);
    const onHandKg = parseTextNumeric(inv.OnHandKg);

    const byBeneficiary = new Map();
    allocs.forEach((alloc) => {
      const line = lineById.get(String(alloc.OrderLineID));
      const order = line ? orderById.get(String(line.OrderID)) : null;
      const beneficiary = order ? beneficiaryById.get(String(order.BeneficiaryID)) : null;
      const benName = beneficiary?.BeneficiaryName || "Unknown";
      const current = byBeneficiary.get(benName) || 0;
      byBeneficiary.set(benName, current + asNumber(alloc.AllocUnits));
    });

    const destinationSummary = byBeneficiary.size
      ? [...byBeneficiary.entries()].map(([name, qty]) => `${name}(${qty})`).join(", ")
      : "Unallocated";

    const row = {
      InventoryID: inv.InventoryID,
      DonorID: lot.DonorID,
      DonorName: lot.tblDonor?.DonorName || String(lot.DonorID),
      LotID: lot.LotID,
      LotCode: lot.LotCode,
      ZoneID: inv.ZoneID,
      ZoneName: inv.tblStorageZone?.ZoneName || String(inv.ZoneID),
      ExpiryDate: lot.ExpiryDate,
      ReceivedDate: lot.ReceivedDate,
      TempRequirement: lot.TempRequirement,
      Status: lot.Status,
      OnHandUnits: onHandUnits,
      OnHandKg: Number(onHandKg.toFixed(2)),
      AllocatedUnits: Number(allocatedUnits.toFixed(2)),
      AllocatedKg: Number(allocatedKg.toFixed(2)),
      AvailableUnits: Number(Math.max(0, onHandUnits - allocatedUnits).toFixed(2)),
      DestinationSummary: destinationSummary,
    };

    const passesAllocation =
      allocationStatus === "all" ||
      (allocationStatus === "allocated" && row.AllocatedUnits > 0) ||
      (allocationStatus === "unallocated" && row.AllocatedUnits <= 0);
    const passesBeneficiary = !term || row.DestinationSummary.toLowerCase().includes(term);
    if (passesAllocation && passesBeneficiary) flatRows.push(row);
  });

  flatRows.sort((a, b) => {
    if (a.DonorName !== b.DonorName) return a.DonorName.localeCompare(b.DonorName);
    if ((a.ExpiryDate || "") !== (b.ExpiryDate || "")) return String(a.ExpiryDate || "").localeCompare(String(b.ExpiryDate || ""));
    return String(a.LotCode || "").localeCompare(String(b.LotCode || ""));
  });

  const groupsMap = new Map();
  flatRows.forEach((row) => {
    const key = `${row.DonorID}::${row.DonorName}`;
    const bucket = groupsMap.get(key) || { donorId: row.DonorID, donorName: row.DonorName, rows: [] };
    bucket.rows.push(row);
    groupsMap.set(key, bucket);
  });

  const groups = [...groupsMap.values()];
  const summary = {
    totalLines: flatRows.length,
    totalOnHandUnits: Number(flatRows.reduce((sum, row) => sum + row.OnHandUnits, 0).toFixed(2)),
    totalOnHandKg: Number(flatRows.reduce((sum, row) => sum + row.OnHandKg, 0).toFixed(2)),
    totalAllocatedUnits: Number(flatRows.reduce((sum, row) => sum + row.AllocatedUnits, 0).toFixed(2)),
    totalAvailableUnits: Number(flatRows.reduce((sum, row) => sum + row.AvailableUnits, 0).toFixed(2)),
    distinctBeneficiaries: new Set(
      flatRows.flatMap((row) =>
        row.DestinationSummary === "Unallocated" ? [] : row.DestinationSummary.split(",").map((part) => part.split("(")[0].trim()),
      ),
    ).size,
  };

  return { groups, summary, flatRows };
}

export async function getInventoryDestinationBreakdown(inventoryId) {
  const { data: inventoryRow, error: inventoryError } = await supabase
    .from("tblInventory")
    .select("InventoryID, LotID, ZoneID, OnHandUnits, OnHandKg, tblStorageZone:ZoneID(ZoneName)")
    .eq("InventoryID", inventoryId)
    .single();
  if (inventoryError) throw inventoryError;

  const { data: lot, error: lotError } = await supabase
    .from("tblDonationLot")
    .select("LotID, LotCode, ProductID, DonorID, ExpiryDate, TempRequirement, Status, tblProduct:ProductID(ProductName), tblDonor:DonorID(DonorName)")
    .eq("LotID", inventoryRow.LotID)
    .single();
  if (lotError) throw lotError;

  const { data: allocations, error: allocError } = await supabase
    .from("tblPickAllocation")
    .select("AllocationID, InventoryID, OrderLineID, AllocUnits, AllocKg, PickedAt, FEFOSeq")
    .eq("InventoryID", inventoryId)
    .order("FEFOSeq", { ascending: true });
  if (allocError) throw allocError;

  const orderLineIds = [...new Set((allocations || []).map((a) => a.OrderLineID))];
  const orderLines = orderLineIds.length
    ? await inBatches("tblOrderLine", "OrderLineID, OrderID, ProductID, QtyUnits, Notes", "OrderLineID", orderLineIds)
    : [];

  const orderIds = [...new Set(orderLines.map((l) => l.OrderID))];
  const orders = orderIds.length
    ? await inBatches("tblOrders", "OrderID, BeneficiaryID, OrderDate, RequiredDeliveryDate, Status, Priority", "OrderID", orderIds)
    : [];

  const beneficiaryIds = [...new Set(orders.map((o) => o.BeneficiaryID))];
  const beneficiaries = beneficiaryIds.length
    ? await inBatches("tblBeneficiary", "BeneficiaryID, BeneficiaryName", "BeneficiaryID", beneficiaryIds)
    : [];

  const lineById = new Map((orderLines || []).map((line) => [String(line.OrderLineID), line]));
  const orderById = new Map((orders || []).map((order) => [String(order.OrderID), order]));
  const beneficiaryById = new Map((beneficiaries || []).map((b) => [String(b.BeneficiaryID), b]));

  const detailItems = (allocations || []).map((alloc) => {
    const line = lineById.get(String(alloc.OrderLineID));
    const order = line ? orderById.get(String(line.OrderID)) : null;
    const beneficiary = order ? beneficiaryById.get(String(order.BeneficiaryID)) : null;
    return {
      AllocationID: alloc.AllocationID,
      OrderLineID: alloc.OrderLineID,
      OrderID: line?.OrderID || null,
      BeneficiaryID: order?.BeneficiaryID || null,
      BeneficiaryName: beneficiary?.BeneficiaryName || "Unknown",
      AllocUnits: asNumber(alloc.AllocUnits),
      AllocKg: asNumber(alloc.AllocKg),
      PickedAt: alloc.PickedAt,
      FEFOSeq: alloc.FEFOSeq,
      OrderStatus: order?.Status || null,
      Priority: order?.Priority ?? null,
      OrderDate: order?.OrderDate || null,
      RequiredDeliveryDate: order?.RequiredDeliveryDate || null,
    };
  });

  const { data: productDemandLines, error: demandError } = await supabase
    .from("tblOrderLine")
    .select("OrderLineID, OrderID, ProductID, QtyUnits")
    .eq("ProductID", lot.ProductID);
  if (demandError) throw demandError;

  const demandOrderIds = [...new Set((productDemandLines || []).map((line) => line.OrderID))];
  const demandOrders = demandOrderIds.length
    ? await inBatches("tblOrders", "OrderID, BeneficiaryID, Status, Priority", "OrderID", demandOrderIds)
    : [];

  const demandBeneficiaryIds = [...new Set(demandOrders.map((o) => o.BeneficiaryID))];
  const demandBeneficiaries = demandBeneficiaryIds.length
    ? await inBatches("tblBeneficiary", "BeneficiaryID, BeneficiaryName", "BeneficiaryID", demandBeneficiaryIds)
    : [];

  const allAllocsForProduct = (productDemandLines || []).length
    ? await inBatches("tblPickAllocation", "OrderLineID, AllocUnits", "OrderLineID", (productDemandLines || []).map((l) => l.OrderLineID))
    : [];

  const allocatedByLine = new Map();
  (allAllocsForProduct || []).forEach((a) => {
    const current = allocatedByLine.get(String(a.OrderLineID)) || 0;
    allocatedByLine.set(String(a.OrderLineID), current + asNumber(a.AllocUnits));
  });

  const demandOrderById = new Map((demandOrders || []).map((o) => [String(o.OrderID), o]));
  const demandBeneficiaryById = new Map((demandBeneficiaries || []).map((b) => [String(b.BeneficiaryID), b]));
  const pendingDemand = (productDemandLines || [])
    .map((line) => {
      const totalAllocated = allocatedByLine.get(String(line.OrderLineID)) || 0;
      const remainingUnits = Math.max(0, asNumber(line.QtyUnits) - totalAllocated);
      const order = demandOrderById.get(String(line.OrderID));
      const beneficiary = order ? demandBeneficiaryById.get(String(order.BeneficiaryID)) : null;
      return {
        OrderLineID: line.OrderLineID,
        OrderID: line.OrderID,
        BeneficiaryName: beneficiary?.BeneficiaryName || "Unknown",
        Priority: order?.Priority ?? null,
        OrderStatus: order?.Status || null,
        RequestedUnits: asNumber(line.QtyUnits),
        AllocatedUnits: totalAllocated,
        RemainingUnits: remainingUnits,
      };
    })
    .filter((line) => line.RemainingUnits > 0 && !["Completed", "Cancelled"].includes(String(line.OrderStatus || "")))
    .sort((a, b) => (b.Priority || 0) - (a.Priority || 0) || a.OrderLineID - b.OrderLineID);

  return {
    inventory: {
      InventoryID: inventoryRow.InventoryID,
      LotID: inventoryRow.LotID,
      LotCode: lot.LotCode,
      DonorName: lot.tblDonor?.DonorName || String(lot.DonorID),
      ProductName: lot.tblProduct?.ProductName || String(lot.ProductID),
      ZoneName: inventoryRow.tblStorageZone?.ZoneName || String(inventoryRow.ZoneID),
      ExpiryDate: lot.ExpiryDate,
      TempRequirement: lot.TempRequirement,
      Status: lot.Status,
      OnHandUnits: parseTextNumeric(inventoryRow.OnHandUnits),
      OnHandKg: parseTextNumeric(inventoryRow.OnHandKg),
    },
    destinations: detailItems,
    pendingDemand,
  };
}
