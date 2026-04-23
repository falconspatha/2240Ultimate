export type SearchParams = Record<string, string | string[] | undefined>;

export function getString(searchParams: SearchParams, key: string, fallback = "") {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export function getNumber(searchParams: SearchParams, key: string, fallback: number) {
  const raw = getString(searchParams, key, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
