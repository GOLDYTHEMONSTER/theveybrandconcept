import Link from "next/link";
import { formatPrice } from "../_lib/format";
import FavoriteButton from "./FavoriteButton";
import type { StorefrontProduct } from "../../../modules/catalog/storefront-view";

export default function ProductCard({ product }: { product: StorefrontProduct }) {
  const soldOut = product.available <= 0;
  const lowStock = !soldOut && product.available <= 5;

  return (
    <Link href={`/store/product/${product.id}`} className="group block shrink-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-surface">
        {(soldOut || lowStock) && (
          <span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide backdrop-blur-md ${soldOut ? "bg-black/70 text-white" : "bg-white/90 text-black"}`}>
            {soldOut ? "Sold out" : "Low stock"}
          </span>
        )}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton productId={product.id} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70" />
        </div>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">No image yet</div>
        )}
      </div>
      <div className="pt-3">
        <h3 className="text-sm text-ink">{product.name}</h3>
        <p className="mt-1 text-sm text-muted">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
