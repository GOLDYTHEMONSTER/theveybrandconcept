import { CATEGORIES } from "../../../modules/catalog/domain";

/**
 * Single source of truth for every category filter used across the
 * storefront (the desktop sidebar's Discover links and ShopGrid's
 * on-page pills) -- both used to be separate hand-written arrays that
 * silently drifted apart ("Tops"/"Sets" existed in the sidebar but not
 * in ShopGrid, so clicking them just showed the unfiltered catalog).
 * Deriving both from modules/catalog/domain.ts's real CATEGORIES makes
 * that drift impossible.
 */
export const SHOP_FILTERS = ["All", "New", ...CATEGORIES] as const;
export type ShopFilter = (typeof SHOP_FILTERS)[number];

export function isShopFilter(value: string | null): value is ShopFilter {
  return value !== null && (SHOP_FILTERS as readonly string[]).includes(value);
}
