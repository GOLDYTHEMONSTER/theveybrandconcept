import { NextResponse } from "next/server";
import { getSessionContext, UnauthenticatedError } from "../../../../lib/auth/session";
import { listVariants } from "../../../../modules/catalog/store";
import { getStockTotals } from "../../../../modules/inventory/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getSessionContext();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    throw error;
  }

  const variants = listVariants().map((variant) => ({
    id: variant.id,
    productName: variant.productName,
    variantLabel: [variant.size, variant.color].filter(Boolean).join(" · ") || "Standard",
    sku: variant.sku,
    price: variant.price,
    available: getStockTotals(variant.id).available,
  }));

  return NextResponse.json({ variants }, { headers: { "Cache-Control": "no-store" } });
}
