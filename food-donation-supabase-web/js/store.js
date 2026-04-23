export const store = {
  globalSearch: "",
  contextOrderId: null,
  contextLotsFilter: null,   // { expiryFilter, sort, sortDir } — set by admin-workspace
  contextOrdersFilter: null, // { status } — set by admin-workspace
  theme: localStorage.getItem("theme") || "light",
  session: null,
};
