import Link from "next/link";
import { getStorefrontProducts, type StorefrontProduct } from "../../modules/catalog/storefront-view";
import ProductCard from "./_components/ProductCard";
import { formatPrice } from "./_lib/format";

export const dynamic = "force-dynamic";

function productRail(title: string, viewAllHref: string, products: StorefrontProduct[]) {
  if (products.length === 0) return null;
  return (
    <section className="mt-16 md:mt-24" key={title}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted">{title}</h2>
        <Link href={viewAllHref} className="text-xs text-muted underline underline-offset-4 hover:text-ink">View all</Link>
      </div>
      <div className="store-scrollbar flex gap-5 overflow-x-auto pb-4">
        {products.map((product) => (
          <div key={product.id} className="w-[220px] shrink-0 md:w-[240px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function StoreHomePage() {
  const products = getStorefrontProducts();

  // The hero and Featured rail are merchant-controlled (Inventory >
  // Feature, in the ERP) rather than an arbitrary "first product" or
  // "whichever happens to have a video" pick -- what shows here is a
  // deliberate choice, not incidental to how the catalog was seeded.
  const featured = products.filter((product) => product.featured);
  const hero = featured.find((product) => product.videoUrl) ?? featured[0] ?? products[0];
  const featuredRail = featured.filter((product) => product.id !== hero?.id);

  const shown = new Set([hero?.id, ...featuredRail.map((product) => product.id)]);
  const rest = products.filter((product) => !shown.has(product.id));

  const categories = Array.from(new Set(rest.map((product) => product.category)));
  const categoryRails = categories.map((category) => ({
    category,
    items: rest.filter((product) => product.category === category).slice(0, 8),
  }));

  return (
    <div className="px-5 pt-8 md:px-10 md:pt-10">
      {hero && (
        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-4xl bg-surface md:aspect-[3/4]">
            {hero.imageUrl && (
              <img src={hero.imageUrl} alt={hero.name} className="h-full w-full object-cover media-fade-in" />
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">The Vey Brand</p>
            <h1 className="mt-3 font-serif text-4xl italic leading-[1.05] md:text-6xl">{hero.name}</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {hero.description ?? "Designed for movement — explore every angle, then verify the real garment in motion."}
            </p>
            <p className="mt-4 text-lg text-ink">{formatPrice(hero.price)}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/store/product/${hero.id}`} className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.01]">
                Explore
              </Link>
              {hero.videoUrl && (
                <Link href={`/store/product/${hero.id}#verify`} className="rounded-full border border-hairline px-6 py-3.5 text-sm text-ink transition-colors hover:bg-surface">
                  Watch real
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {productRail("Featured", "/store/shop", featuredRail)}
      {categoryRails.map(({ category, items }) => productRail(category, `/store/shop?category=${encodeURIComponent(category)}`, items))}
      {featuredRail.length === 0 && categoryRails.length === 0 && (
        <p className="mt-16 text-sm text-muted">More pieces are on the way.</p>
      )}
    </div>
  );
}
