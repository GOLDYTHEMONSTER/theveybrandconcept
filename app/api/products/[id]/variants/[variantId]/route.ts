import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../../modules/audit/sandbox-log";
import { getVariant, removeVariant, updateVariant } from "../../../../../../modules/catalog/store";
import { parseUpdateVariantInput } from "../../../../../../modules/catalog/validation";
import { guardMutation, handleApiError } from "../../../../../../modules/security/api-guard";
import { NotFoundError } from "../../../../../../modules/shared/errors";

export async function PATCH(request: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    const session = await guardMutation(request, "products.create");

    const before = getVariant(params.variantId);
    if (!before) throw new NotFoundError("Product variant not found");

    const input = parseUpdateVariantInput(await request.json());
    const variant = updateVariant(params.variantId, input);

    recordAudit({
      action: "products.variant_update",
      entityType: "product_variant",
      entityId: variant.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { price: before.variant.price, compareAtPrice: before.variant.compareAtPrice, size: before.variant.size, color: before.variant.color },
      afterValue: { price: variant.price, compareAtPrice: variant.compareAtPrice, size: variant.size, color: variant.color },
    });

    return NextResponse.json({ variant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    const session = await guardMutation(request, "products.create");

    const found = getVariant(params.variantId);
    if (!found) throw new NotFoundError("Product variant not found");

    removeVariant(params.variantId);

    recordAudit({
      action: "products.variant_remove",
      entityType: "product_variant",
      entityId: params.variantId,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { sku: found.variant.sku, size: found.variant.size, color: found.variant.color },
    });

    return NextResponse.json({ id: params.variantId });
  } catch (error) {
    return handleApiError(error);
  }
}
