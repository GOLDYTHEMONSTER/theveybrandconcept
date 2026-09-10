const FAVORITES_KEY = "tvb_store_favorites";
const FAVORITES_EVENT = "tvb-favorites-updated";

export function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]): void {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function isFavorite(productId: string): boolean {
  return readFavorites().includes(productId);
}

export function toggleFavorite(productId: string): boolean {
  const current = readFavorites();
  const exists = current.includes(productId);
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
  writeFavorites(next);
  return !exists;
}

/**
 * Drops any saved id that no longer matches a real product -- e.g. a
 * favorite from before a catalog cleanup. Without this, that id sits in
 * localStorage forever: invisible on the Favorites page (nothing renders
 * for a product that doesn't exist) yet still counted in the header
 * badge, with no control anywhere to remove it.
 */
export function pruneFavorites(validProductIds: string[]): void {
  const current = readFavorites();
  const next = current.filter((id) => validProductIds.includes(id));
  if (next.length !== current.length) writeFavorites(next);
}

export function subscribeToFavorites(callback: () => void): () => void {
  window.addEventListener(FAVORITES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
