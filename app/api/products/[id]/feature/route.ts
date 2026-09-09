import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { getProduct, setProductFeatured } from "../../../../../modules/catalog/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "products.create");

    const body = (await request.json()) as Partial<{ featured: boolean }>;
    if (typeof body.featured !== "boolean") {
      throw new ValidationError("featured must be true or false");
    }

    const before = getProduct(params.id);
    const product = setProductFeatured(params.id, body.featured);

    recordAudit({
      action: "products.feature",
      entityType: "product",
      entityId: product.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { featured: before?.featured ?? false },
      afterValue: { featured: product.featured },
    });

    return NextResponse.json({ id: product.id, featured: product.featured });
  } catch (error) {
    return handleApiError(error);
  }
}
