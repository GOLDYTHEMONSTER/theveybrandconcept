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

export function subscribeToFavorites(callback: () => void): () => void {
  window.addEventListener(FAVORITES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
