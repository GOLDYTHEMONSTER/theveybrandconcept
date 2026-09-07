import { getStorefrontProducts } from "../../../modules/catalog/storefront-view";
import MasonryGallery, { type GalleryPin } from "../_components/MasonryGallery";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  const products = getStorefrontProducts();

  const pins: GalleryPin[] = products.flatMap((product) => {
    const images = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
    return images.map((image, index) => ({
      key: `${product.id}-${index}`,
      productId: product.id,
      image,
      name: product.name,
      price: product.price,
    }));
  });

  return (
    <div className="px-5 pb-16 pt-8 md:px-10 md:pt-10">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Gallery</p>
      <h1 className="mt-2 font-serif text-3xl italic md:text-4xl">Every angle, in one feed.</h1>
      <p className="mt-2 max-w-md text-sm text-muted">Every piece, every angle — tap any image to explore it.</p>

      <div className="mt-8">
        <MasonryGallery pins={pins} />
      </div>
    </div>
  );
}
