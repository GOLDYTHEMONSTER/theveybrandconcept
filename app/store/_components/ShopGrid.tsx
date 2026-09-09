"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { isShopFilter, SHOP_FILTERS, type ShopFilter } from "../_lib/categories";
import type { StorefrontProduct } from "../../../modules/catalog/storefront-view";

function filterFromUrl(value: string | null): ShopFilter {
  return isShopFilter(value) ? value : "All";
}

function ShopGridInner({ products }: { products: StorefrontProduct[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category");
  const [active, setActive] = useState<ShopFilter>(() => filterFromUrl(urlCategory));

  // The sidebar's category links navigate to this same route with a new
  // ?category= -- App Router keeps this component mounted across that,
  // so without this effect `active` (set once via useState's initializer)
  // never updated and clicking a sidebar link silently did nothing.
  useEffect(() => {
    setActive(filterFromUrl(urlCategory));
  }, [urlCategory]);

  function selectCategory(category: ShopFilter) {
    setActive(category);
    const query = category === "All" ? "" : `?category=${encodeURIComponent(category)}`;
    router.replace(`/store/shop${query}`, { scroll: false });
  }

  const visible = useMemo(() => {
    if (active === "All") return products;
    if (active === "New") return products.slice(0, 4);
    return products.filter((product) => product.category === active);
  }, [active, products]);

  return (
    <div>
      <div className="store-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
        {SHOP_FILTERS.map((category) => (
          <button
            key={category}
            onClick={() => selectCategory(category)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-colors ${active === category ? "border-ink bg-ink text-canvas" : "border-hairline text-muted hover:text-ink"}`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {visible.length === 0 && <p className="col-span-full text-sm text-muted">Nothing here yet.</p>}
      </div>
    </div>
  );
}

export default function ShopGrid({ products }: { products: StorefrontProduct[] }) {
  return (
    <Suspense fallback={null}>
      <ShopGridInner products={products} />
    </Suspense>
  );
}
