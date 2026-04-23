export function required(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function nonNegativeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

export function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function validateLotDates(receivedDate, expiryDate) {
  if (!receivedDate || !expiryDate) return false;
  return new Date(expiryDate).getTime() >= new Date(receivedDate).getTime();
}

export function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}
