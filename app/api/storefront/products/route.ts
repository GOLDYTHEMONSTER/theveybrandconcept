import { NextResponse } from "next/server";
import { getStorefrontProducts } from "../../../../modules/catalog/storefront-view";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read of the live catalog. No cost data, no
 * customer data — safe to expose. Stock is derived from the same ledger
 * the ERP Inventory page reads, so "sold out" here means the same thing
 * it means internally.
 */
export async function GET() {
  return NextResponse.json({ products: getStorefrontProducts() }, { headers: { "Cache-Control": "no-store" } });
}
