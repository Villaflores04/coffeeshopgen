// Business rules shown in the UI. The database enforces the same numbers in
// supabase/migrations/20261028000000_init.sql (place_order / set_order_status).

export const PESOS_PER_POINT_EARNED = 20; // spend ₱20, earn 1 point
export const PESOS_PER_POINT_REDEEMED = 1; // 1 point = ₱1 off
export const MAX_REDEEM_RATIO = 0.5; // points can cover up to half the subtotal
export const REFERRAL_BONUS = 50;
export const REFERRAL_MIN_ORDER = 200;

export const ORDER_STEPS = [
  'placed',
  'confirmed',
  'packed',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

export const ORDER_LABEL = {
  placed: 'Order placed',
  confirmed: 'Shop confirmed',
  packed: 'Packed',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// The button label an owner sees to move an order to the next step.
export const NEXT_ACTION = {
  placed: 'Confirm order',
  confirmed: 'Mark as packed',
  packed: 'Hand to courier',
  picked_up: 'Mark in transit',
  in_transit: 'Send out for delivery',
  out_for_delivery: 'Mark as delivered',
};

export const nextStatus = (status) => {
  const i = ORDER_STEPS.indexOf(status);
  return i >= 0 && i < ORDER_STEPS.length - 1 ? ORDER_STEPS[i + 1] : null;
};

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on delivery', hint: 'Pay the rider when your order arrives.' },
  { id: 'gcash', label: 'GCash to the rider', hint: 'Scan the rider’s QR code on delivery.' },
];
