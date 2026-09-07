import Link from "next/link";
import { getStorefrontProducts } from "../../modules/catalog/storefront-view";
import ProductCard from "./_components/ProductCard";
import { formatPrice } from "./_lib/format";

export const dynamic = "force-dynamic";

export default function StoreHomePage() {
  const products = getStorefrontProducts();
  const hero = products.find((product) => product.videoUrl) ?? products[0];
  const newThisWeek = products.filter((product) => product.id !== hero?.id).slice(0, 8);

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
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Summer &apos;26</p>
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

      <section className="mt-16 md:mt-24">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted">New this week</h2>
          <Link href="/store/shop" className="text-xs text-muted underline underline-offset-4 hover:text-ink">View all</Link>
        </div>
        <div className="store-scrollbar flex gap-5 overflow-x-auto pb-4">
          {newThisWeek.map((product) => (
            <div key={product.id} className="w-[220px] shrink-0 md:w-[240px]">
              <ProductCard product={product} />
            </div>
          ))}
          {newThisWeek.length === 0 && <p className="text-sm text-muted">More pieces are on the way.</p>}
        </div>
      </section>
    </div>
  );
}
