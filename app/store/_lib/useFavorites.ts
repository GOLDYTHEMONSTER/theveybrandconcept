"use client";

import { useEffect, useState } from "react";
import { pruneFavorites, readFavorites, subscribeToFavorites } from "./favorites";

let catalogIdsPromise: Promise<string[]> | null = null;

function loadCatalogIds(): Promise<string[]> {
  if (!catalogIdsPromise) {
    catalogIdsPromise = fetch("/api/storefront/products")
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data: { products?: Array<{ id: string }> }) => (data.products ?? []).map((product) => product.id))
      .catch(() => []);
  }
  return catalogIdsPromise;
}

export function useFavorites(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readFavorites());
    const unsubscribe = subscribeToFavorites(() => setIds(readFavorites()));
    loadCatalogIds().then((validIds) => {
      if (validIds.length) pruneFavorites(validIds);
    });
    return unsubscribe;
  }, []);

  return ids;
}
