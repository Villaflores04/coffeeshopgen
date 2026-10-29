import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConfirm } from './ConfirmContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);
const KEY = 'coffeeshopgen.cart.v2';
const EMPTY = { shop: null, items: [] };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return raw?.items ? raw : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The cart holds items from one shop at a time. Prices here are for display;
 *  the database recomputes everything when the order is placed. */
export function CartProvider({ children }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [cart, setCart] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {
      /* storage can be unavailable (private mode); the cart still works in memory */
    }
  }, [cart]);

  const addItem = useCallback(
    async (shop, product, sizeName) => {
      let base = cart;
      if (cart.shop && cart.shop.id !== shop.id) {
        const ok = await confirm({
          title: 'Start a new cart?',
          message: `Your cart has items from ${cart.shop.name}. Adding this will clear it.`,
          confirmText: 'Start new cart',
        });
        if (!ok) return;
        base = EMPTY;
      }

      const extra = (product.sizes ?? []).find((s) => s.name === sizeName)?.extra ?? 0;
      const key = `${product.id}|${sizeName ?? ''}`;
      const existing = base.items.find((i) => i.key === key);

      if (existing && existing.qty >= product.stock) {
        toast.error(`That’s all we have of ${product.name}.`);
        return;
      }

      const items = existing
        ? base.items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1, max: product.stock } : i))
        : [
            ...base.items,
            {
              key,
              productId: product.id,
              name: product.name,
              size: sizeName ?? null,
              unitPrice: Number(product.price) + Number(extra),
              qty: 1,
              max: product.stock,
            },
          ];

      setCart({
        shop: { id: shop.id, name: shop.name, delivery_fee: shop.delivery_fee, min_order: shop.min_order },
        items,
      });
      toast.success(`Added ${product.name}`);
    },
    [cart, confirm, toast]
  );

  const setQty = useCallback((key, qty) => {
    setCart((c) => {
      const items = c.items
        .map((i) => (i.key === key ? { ...i, qty: Math.min(qty, i.max || qty) } : i))
        .filter((i) => i.qty > 0);
      return { shop: items.length ? c.shop : null, items };
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo(() => {
    const subtotal = cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const count = cart.items.reduce((s, i) => s + i.qty, 0);
    return { shop: cart.shop, items: cart.items, subtotal, count, addItem, setQty, clear };
  }, [cart, addItem, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
