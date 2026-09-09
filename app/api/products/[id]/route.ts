import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { getProduct, updateProduct } from "../../../../modules/catalog/store";
import { parseUpdateProductInput } from "../../../../modules/catalog/validation";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { NotFoundError } from "../../../../modules/shared/errors";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "products.create");

    const before = getProduct(params.id);
    if (!before) throw new NotFoundError("Product not found");

    const input = parseUpdateProductInput(await request.json());
    const product = updateProduct(params.id, input);

    recordAudit({
      action: "products.update",
      entityType: "product",
      entityId: product.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { name: before.name, category: before.category, status: before.status },
      afterValue: { name: product.name, category: product.category, status: product.status },
    });

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
