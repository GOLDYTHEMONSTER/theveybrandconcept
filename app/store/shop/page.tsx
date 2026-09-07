import { getStorefrontProducts } from "../../../modules/catalog/storefront-view";
import ShopGrid from "../_components/ShopGrid";

export const dynamic = "force-dynamic";

export default function ShopPage() {
  const products = getStorefrontProducts();

  return (
    <div className="px-5 pt-8 md:px-10 md:pt-10">
      <h1 className="font-serif text-3xl italic md:text-4xl">The collection</h1>
      <p className="mt-2 max-w-md text-sm text-muted">Explore every angle, then verify the real garment in motion.</p>

      <div className="mt-8">
        <ShopGrid products={products} />
      </div>
    </div>
  );
}
