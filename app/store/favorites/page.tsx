"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavorites } from "../_lib/useFavorites";
import ProductCard from "../_components/ProductCard";
import type { StorefrontProduct } from "../../../modules/catalog/storefront-view";

export default function FavoritesPage() {
  const favoriteIds = useFavorites();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/storefront/products")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoaded(true));
  }, []);

  const favorites = products.filter((product) => favoriteIds.includes(product.id));

  return (
    <div className="px-5 pb-16 pt-8 md:px-10 md:pt-10">
      <h1 className="font-serif text-3xl italic md:text-4xl">Saved</h1>
      <p className="mt-2 max-w-md text-sm text-muted">Pieces you&apos;ve saved for later.</p>

      <div className="mt-8">
        {!loaded ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : favorites.length === 0 ? (
          <div>
            <p className="text-sm text-muted">Nothing saved yet — tap the heart on any piece to add it here.</p>
            <Link href="/store/shop" className="mt-5 inline-block rounded-full border border-hairline px-6 py-3 text-sm transition-colors hover:bg-surface">
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
