"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import type { StorefrontProduct } from "../../../modules/catalog/storefront-view";

const CATEGORIES = ["All", "Dresses", "Gowns", "Outerwear", "Accessories", "New"];

function ShopGridInner({ products }: { products: StorefrontProduct[] }) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category");
  const [active, setActive] = useState(initial && CATEGORIES.includes(initial) ? initial : "All");

  const visible = useMemo(() => {
    if (active === "All") return products;
    if (active === "New") return products.slice(0, 4);
    return products.filter((product) => product.category === active);
  }, [active, products]);

  return (
    <div>
      <div className="store-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActive(category)}
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
