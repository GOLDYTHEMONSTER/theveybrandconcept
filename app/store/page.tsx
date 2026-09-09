import Link from "next/link";
import { getStorefrontProducts, type StorefrontProduct } from "../../modules/catalog/storefront-view";
import HeroCarousel from "./_components/HeroCarousel";
import ProductCard from "./_components/ProductCard";

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

  // The carousel is merchant-controlled (Inventory > Feature, in the
  // ERP) rather than an arbitrary "first product" pick -- what shows
  // here is a deliberate choice, not incidental to how the catalog was
  // seeded. Falls back to the first product only if nothing is featured
  // yet, so the homepage is never empty.
  const featured = products.filter((product) => product.featured);
  const heroProducts = featured.length > 0 ? featured : products.slice(0, 1);

  const shown = new Set(heroProducts.map((product) => product.id));
  const rest = products.filter((product) => !shown.has(product.id));

  const categories = Array.from(new Set(rest.map((product) => product.category)));
  const categoryRails = categories.map((category) => ({
    category,
    items: rest.filter((product) => product.category === category).slice(0, 8),
  }));

  return (
    <div className="px-5 pt-8 md:px-10 md:pt-10">
      <HeroCarousel products={heroProducts} />

      {categoryRails.map(({ category, items }) => productRail(category, `/store/shop?category=${encodeURIComponent(category)}`, items))}
      {categoryRails.length === 0 && (
        <p className="mt-16 text-sm text-muted">More pieces are on the way.</p>
      )}
    </div>
  );
}
