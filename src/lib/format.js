const pesoFull = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

/** ₱1,234.50 */
export const peso = (n) => pesoFull.format(Number(n || 0));

/** ₱140 when whole, ₱140.50 otherwise. Used for menu prices. */
export const pesoShort = (n) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? `₱${v.toLocaleString('en-PH')}` : pesoFull.format(v);
};

export const orderNo = (n) => `#${n}`;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(iso) {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '☕';

export const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

export const errMsg = (e) => e?.message || 'Something went wrong. Try again.';
