// Fiyat tablosunun yayımlanma zamanı, fiyatın ölçüldüğü zaman değildir.
export const MAX_PRICE_AGE_MS = 3 * 86400000;
export function isStaleDate(value, now = Date.now()) {
  const time = Date.parse(value);
  return !Number.isFinite(time) || time > now + 300000 || now - time > MAX_PRICE_AGE_MS;
}

export function normalizePriceSnapshot(raw, fallback = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid price snapshot');
  const metadata = raw.metadata || {};
  const table = raw.prices || raw;
  const divisor = fallback || metadata.currency !== 'USD' ? 100 : 1;
  const prices = {};
  for (const [key, value] of Object.entries(table)) {
    if (Number.isFinite(value) && value > 0) prices[key] = value / divisor;
  }
  if (!Object.keys(prices).length) throw new Error('Empty price snapshot');
  // Mevcut fiyat haritası sözleşmesini bozmadan kaynağı aynı nesnede taşır.
  Object.defineProperty(prices, '__snapshot', { enumerable: false, value: {
    ...metadata, fallback, details: raw.details || {},
    primary_label: fallback ? 'ByMykel / Steam' : metadata.primary_label || 'Market snapshot',
    primary_snapshot: fallback ? metadata.updated_at : metadata.primary_snapshot,
  } });
  return prices;
}

export function getPriceQuality(prices, key, now = Date.now()) {
  if (!key || !Number.isFinite(prices?.[key]) || prices[key] <= 0) return 'missing';
  const snapshot = prices.__snapshot;
  if (!snapshot) return 'unknown';
  const detail = snapshot.details[key];
  if (!detail) return snapshot.fallback && !isStaleDate(snapshot.primary_snapshot, now) ? 'market' : 'unknown';
  if (isStaleDate(detail.updated_at, now)) return 'stale';
  return detail.estimated ? 'estimated' : 'market';
}
