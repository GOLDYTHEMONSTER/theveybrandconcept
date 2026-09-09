import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { addVariant, getProduct } from "../../../../../modules/catalog/store";
import { parseAddVariantInput } from "../../../../../modules/catalog/validation";
import { seedInitialStock } from "../../../../../modules/inventory/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { NotFoundError, ValidationError } from "../../../../../modules/shared/errors";
import { isWarehouse, WAREHOUSES } from "../../../../../modules/shared/warehouses";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "products.create");

    const product = getProduct(params.id);
    if (!product) throw new NotFoundError("Product not found");

    const body = (await request.json()) as Record<string, unknown>;
    const input = parseAddVariantInput(body);
    const initialStock = typeof body.initialStock === "number" ? Math.max(0, Math.round(body.initialStock)) : 0;
    const warehouse = typeof body.warehouse === "string" ? body.warehouse : WAREHOUSES[0];
    if (!isWarehouse(warehouse)) throw new ValidationError("Select a valid warehouse");

    const variant = addVariant(params.id, input);
    if (initialStock > 0) {
      seedInitialStock({ variantId: variant.id, warehouse, quantity: initialStock, actorId: session.userId });
    }

    recordAudit({
      action: "products.variant_add",
      entityType: "product_variant",
      entityId: variant.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { productId: product.id, sku: variant.sku, size: variant.size, color: variant.color, price: variant.price },
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
