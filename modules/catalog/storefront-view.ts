import { listProducts } from "./store";
import { getStockTotals } from "../inventory/store";

export interface StorefrontProduct {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  images: string[];
  videoUrl: string | null;
  colors: string[];
  sizes: string[];
  price: number;
  compareAtPrice: number | null;
  available: number;
  featured: boolean;
}

export function getStorefrontProducts(): StorefrontProduct[] {
  return listProducts()
    .filter((product) => product.status === "active")
    .map((product) => {
      const primaryVariant = product.variants[0];
      const prices = product.variants.map((variant) => variant.price);
      const compareAtPrices = product.variants
        .map((variant) => variant.compareAtPrice)
        .filter((value): value is number => value !== null);
      const available = product.variants.reduce(
        (sum, variant) => sum + Math.max(0, getStockTotals(variant.id).available),
        0
      );

      return {
        id: product.id,
        slug: product.slug,
        sku: primaryVariant?.sku ?? null,
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: product.imageUrl,
        images: product.images,
        videoUrl: product.videoUrl,
        colors: [...new Set(product.variants.map((variant) => variant.color).filter((value): value is string => Boolean(value)))],
        sizes: [...new Set(product.variants.map((variant) => variant.size).filter((value): value is string => Boolean(value)))],
        price: Math.min(...prices),
        compareAtPrice: compareAtPrices.length ? Math.max(...compareAtPrices) : null,
        available,
        featured: product.featured,
      };
    });
}

export function getStorefrontProduct(id: string): StorefrontProduct | undefined {
  return getStorefrontProducts().find((product) => product.id === id);
}
