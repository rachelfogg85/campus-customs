/** Typed client for the FastAPI backend. */

const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export interface InventoryEntry {
  size: string;
  quantity: number;
}

export interface Product {
  product_id: string;
  name: string;
  garment_type: string;
  description: string;
  colors: string[];
  search_tags: string[];
  image_file_path: string;
  image_url: string;
  price: number;
  inventory: InventoryEntry[];
  total_stock: number;
}

export interface ProductsResponse {
  count: number;
  products: Product[];
}

export interface ChatResponse {
  reply: string;
  products: Product[];
  tools_used: string[];
}

export interface ChatMessageOut {
  role: "user" | "assistant";
  content: string;
  products: Product[];
  created_at: string | null;
}

export interface CartItemOut {
  product: Product;
  size: string;
  quantity: number;
}

export interface CartResponse {
  items: CartItemOut[];
  subtotal: number;
  item_count: number;
}

export interface User {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string;
}

export interface SignupPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Reads the FastAPI error payload, falling back to the raw status text. */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) {
      return body.detail[0].msg;
    }
  } catch {
    /* body wasn't JSON — fall through to the status text */
  }
  return `${res.status} ${res.statusText}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return (await res.json()) as T;
}

export function fetchProducts(signal?: AbortSignal) {
  return request<ProductsResponse>("/api/products", { signal });
}

export function fetchProduct(productId: string, signal?: AbortSignal) {
  return request<Product>(`/api/products/${encodeURIComponent(productId)}`, {
    signal,
  });
}

export function signup(payload: SignupPayload, signal?: AbortSignal) {
  return request<User>("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export function login(payload: LoginPayload, signal?: AbortSignal) {
  return request<User>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export function sendChat(
  message: string,
  userId?: number | null,
  productId?: string | null,
  signal?: AbortSignal,
) {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      user_id: userId ?? null,
      product_id: productId ?? null,
    }),
    signal,
  });
}

/** A logged-in shopper's past conversation, for reloading it when they return. */
export function fetchChatHistory(userId: number, signal?: AbortSignal) {
  return request<ChatMessageOut[]>(
    `/api/chat/history?user_id=${encodeURIComponent(userId)}`,
    { signal },
  );
}

/** A logged-in shopper's cart. Guests never call this — see cart.tsx. */
export function fetchCart(userId: number, signal?: AbortSignal) {
  return request<CartResponse>(`/api/cart?user_id=${encodeURIComponent(userId)}`, {
    signal,
  });
}

export function addCartItem(
  userId: number,
  productId: string,
  size: string,
  quantity: number,
  signal?: AbortSignal,
) {
  return request<CartResponse>("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, product_id: productId, size, quantity }),
    signal,
  });
}

/** Set a cart line to an exact quantity; 0 removes it. */
export function setCartItemQuantity(
  userId: number,
  productId: string,
  size: string,
  quantity: number,
  signal?: AbortSignal,
) {
  return request<CartResponse>("/api/cart/items", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, product_id: productId, size, quantity }),
    signal,
  });
}

/** Full URL for a product image served by the backend's /media mount. */
export function imageUrl(product: Product): string {
  return `${BASE}${product.image_url}`;
}
