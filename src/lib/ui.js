// Shared style tokens and formatting helpers.

export const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200';

export const btnCls =
  'rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhostCls =
  'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50';

export const cardCls = 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm';

export const ORDER_STEPS = [
  'placed',
  'confirmed',
  'packed',
  'ready_for_pickup',
  'in_transit',
  'delivered',
];

export const ORDER_LABEL = {
  placed: 'Order placed',
  confirmed: 'Shop confirmed',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
