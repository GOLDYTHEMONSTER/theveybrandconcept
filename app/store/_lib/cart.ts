export interface CartLine {
  variantId: string;
  sku: string;
  name: string;
  color: string | null;
  size: string | null;
  price: number;
  image: string | null;
  quantity: number;
}

const CART_KEY = "tvb_store_cart";
const CART_EVENT = "tvb-cart-updated";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]): void {
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(line: CartLine): void {
  const lines = readCart();
  const existing = lines.find((entry) => entry.variantId === line.variantId);
  if (existing) {
    existing.quantity += line.quantity;
  } else {
    lines.push(line);
  }
  writeCart(lines);
}

export function updateQuantity(variantId: string, quantity: number): void {
  const lines = readCart()
    .map((entry) => (entry.variantId === variantId ? { ...entry, quantity } : entry))
    .filter((entry) => entry.quantity > 0);
  writeCart(lines);
}

export function removeFromCart(variantId: string): void {
  writeCart(readCart().filter((entry) => entry.variantId !== variantId));
}

export function clearCart(): void {
  writeCart([]);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}

export function subscribeToCart(callback: () => void): () => void {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
