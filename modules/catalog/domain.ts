import type { Warehouse } from "../shared/warehouses";

export const CATEGORIES = ["Dresses", "Gowns", "Outerwear", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRODUCT_STATUSES = ["draft", "active"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  category: Category;
  description: string | null;
  status: ProductStatus;
  imageUrl: string | null;
  /** Additional angles (front/side/back/detail) for the storefront AI-preview viewer. Falls back to [imageUrl]. */
  images: string[];
  /** Real product video for the storefront "Verify it" interaction. */
  videoUrl: string | null;
  /** Merchant-controlled: shows in the storefront homepage's Featured rail. */
  featured: boolean;
  variants: ProductVariant[];
  createdBy: string;
  createdAt: string;
}

export interface CreateProductInput {
  name: string;
  category: Category;
  description: string | null;
  status: ProductStatus;
  imageUrl: string | null;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
  initialStock: number;
  warehouse: Warehouse;
}
