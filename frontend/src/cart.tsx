import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addCartItem, fetchCart, setCartItemQuantity, type CartItemOut, type Product } from "./api";
import { useAuth } from "./auth";

const GUEST_CART_KEY = "campus-customs-guest-cart";

/**
 * Guests get a cart that lives only in this browser (localStorage) — same
 * split as chat history (Problem 8): no account, no server row. Logging in
 * merges whatever's in the local cart into the account's server-side cart
 * (`cart_items` table) exactly once, then the server becomes the source of
 * truth for the rest of the session.
 */
function readGuestCart(): CartItemOut[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as CartItemOut[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItemOut[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function stockFor(product: Product, size: string): number {
  return product.inventory.find((i) => i.size === size)?.quantity ?? 0;
}

interface CartValue {
  items: CartItemOut[];
  subtotal: number;
  itemCount: number;
  addItem: (product: Product, size: string, quantity: number) => Promise<void>;
  setQuantity: (productId: string, size: string, quantity: number) => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemOut[]>(() => readGuestCart());

  useEffect(() => {
    let cancelled = false;

    async function syncForUser(userId: number) {
      const guestItems = readGuestCart();
      if (guestItems.length > 0) {
        for (const line of guestItems) {
          await addCartItem(userId, line.product.product_id, line.size, line.quantity);
        }
        writeGuestCart([]);
      }
      const cart = await fetchCart(userId);
      if (!cancelled) setItems(cart.items);
    }

    if (user) {
      syncForUser(user.id).catch(() => {
        /* Cart sync is best-effort — a failed reload still leaves a usable (if stale) cart. */
      });
    } else {
      setItems(readGuestCart());
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  );
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  async function addItem(product: Product, size: string, quantity: number) {
    if (user) {
      const cart = await addCartItem(user.id, product.product_id, size, quantity);
      setItems(cart.items);
      return;
    }
    setItems((prev) => {
      const maxQty = stockFor(product, size);
      const existing = prev.find(
        (i) => i.product.product_id === product.product_id && i.size === size,
      );
      const next = existing
        ? prev.map((i) =>
            i === existing
              ? { ...i, quantity: Math.min(i.quantity + quantity, maxQty) }
              : i,
          )
        : [...prev, { product, size, quantity: Math.min(quantity, maxQty) }];
      writeGuestCart(next);
      return next;
    });
  }

  async function setQuantity(productId: string, size: string, quantity: number) {
    if (user) {
      const cart = await setCartItemQuantity(user.id, productId, size, quantity);
      setItems(cart.items);
      return;
    }
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => !(i.product.product_id === productId && i.size === size))
          : prev.map((i) =>
              i.product.product_id === productId && i.size === size
                ? { ...i, quantity: Math.min(quantity, stockFor(i.product, size)) }
                : i,
            );
      writeGuestCart(next);
      return next;
    });
  }

  return (
    <CartContext.Provider value={{ items, subtotal, itemCount, addItem, setQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
