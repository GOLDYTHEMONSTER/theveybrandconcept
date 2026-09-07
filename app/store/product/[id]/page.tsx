import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStorefrontProduct } from "../../../../modules/catalog/storefront-view";
import { findVariantBySku } from "../../../../modules/catalog/store";
import VerifyIt from "../../_components/VerifyIt";
import AddToCartForm from "../../_components/AddToCartForm";
import FavoriteButton from "../../_components/FavoriteButton";
import SizeChart from "../../_components/SizeChart";
import { formatPrice } from "../../_lib/format";

export const dynamic = "force-dynamic";

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getStorefrontProduct(params.id);
  if (!product) notFound();

  const variant = product.sku ? findVariantBySku(product.sku) : undefined;

  return (
    <div className="px-5 pb-16 pt-6 md:px-10 md:pt-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/store/shop" className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors hover:bg-surface" aria-label="Back">
          <ChevronLeft size={16} />
        </Link>
        <FavoriteButton productId={product.id} className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors hover:bg-surface" />
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-14">
        <div id="verify">
          <VerifyIt images={product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : []} videoUrl={product.videoUrl} name={product.name} />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted">{product.category}</p>
          <h1 className="mt-2 font-serif text-3xl italic md:text-4xl">{product.name}</h1>
          <p className="mt-3 text-lg text-ink">
            {formatPrice(product.price)}
            {product.compareAtPrice && <span className="ml-2 text-sm text-muted line-through">{formatPrice(product.compareAtPrice)}</span>}
          </p>

          {product.description && <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">{product.description}</p>}

          <div className="mt-8 border-t border-hairline pt-8">
            <AddToCartForm
              variantId={variant?.id ?? product.id}
              sku={product.sku ?? product.id}
              name={product.name}
              price={product.price}
              image={product.imageUrl}
              colors={product.colors}
              sizes={product.sizes}
              available={product.available}
            />
          </div>

          <SizeChart sizes={product.sizes} />
        </div>
      </div>
    </div>
  );
}
