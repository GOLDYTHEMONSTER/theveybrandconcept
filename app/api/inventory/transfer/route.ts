import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { requireVariant } from "../../../../modules/catalog/store";
import { transferStock } from "../../../../modules/inventory/store";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { ValidationError } from "../../../../modules/shared/errors";
import { isWarehouse } from "../../../../modules/shared/warehouses";

interface TransferBody {
  variantId: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "inventory.transfer");

    const body = (await request.json()) as Partial<TransferBody>;
    if (!body.variantId || !body.fromWarehouse || !body.toWarehouse || typeof body.quantity !== "number" || !Number.isInteger(body.quantity) || body.quantity < 1) {
      throw new ValidationError("variantId, fromWarehouse, toWarehouse and a positive whole quantity are required");
    }
    if (!isWarehouse(body.fromWarehouse) || !isWarehouse(body.toWarehouse)) {
      throw new ValidationError("Select valid warehouses");
    }

    const { product, variant } = requireVariant(body.variantId);
    const { from, to } = transferStock({
      variantId: variant.id,
      fromWarehouse: body.fromWarehouse,
      toWarehouse: body.toWarehouse,
      quantity: body.quantity,
      actorId: session.userId,
    });

    recordAudit({
      action: "inventory.transfer",
      entityType: "product_variant",
      entityId: variant.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { quantity: body.quantity, from: body.fromWarehouse, to: body.toWarehouse },
    });

    return NextResponse.json({ productName: product.name, sku: variant.sku, from, to });
  } catch (error) {
    return handleApiError(error);
  }
}
