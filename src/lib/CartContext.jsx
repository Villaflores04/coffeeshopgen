import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'coffeeshopgen-cart';
const EMPTY = { shop: null, items: [] };

// The cart holds items from one shop at a time.
export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? EMPTY;
    } catch {
      return EMPTY;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  function addItem(shop, product, size = null) {
    let base = cart;
    if (cart.shop && cart.shop.id !== shop.id) {
      const ok = window.confirm(
        `Your cart has items from ${cart.shop.name}. Clear it and add from ${shop.name} instead?`
      );
      if (!ok) return;
      base = EMPTY;
    }

    const key = `${product.id}-${size ?? ''}`;
    const existing = base.items.find((i) => i.key === key);
    const items = existing
      ? base.items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i))
      : [
          ...base.items,
          {
            key,
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            size,
            qty: 1,
          },
        ];

    setCart({ shop: { id: shop.id, name: shop.name }, items });
  }

  function updateQty(key, delta) {
    const items = cart.items
      .map((i) => (i.key === key ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    setCart({ shop: items.length ? cart.shop : null, items });
  }

  function clearCart() {
    setCart(EMPTY);
  }

  const total = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);

  const value = useMemo(
    () => ({ ...cart, total, count, addItem, updateQty, clearCart }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
