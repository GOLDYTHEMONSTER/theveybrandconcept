import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../modules/audit/sandbox-log";
import { guardMutation, handleApiError } from "../../../modules/security/api-guard";
import { ValidationError } from "../../../modules/shared/errors";
import { isWarehouse } from "../../../modules/shared/warehouses";
import { createPurchaseOrder } from "../../../modules/procurement/store";

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "inventory.adjust");

    const body = (await request.json()) as Partial<{ variantId: string; warehouse: string; quantity: number }>;
    if (!body.variantId || !isWarehouse(body.warehouse) || !body.quantity) {
      throw new ValidationError("variantId, warehouse and quantity are required");
    }

    const order = createPurchaseOrder({
      variantId: body.variantId,
      warehouse: body.warehouse,
      quantity: body.quantity,
      createdById: session.userId,
      createdByName: session.name,
    });

    recordAudit({
      action: "procurement.create",
      entityType: "purchase_order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { poNumber: order.poNumber, sku: order.sku, quantity: order.quantity, warehouse: order.warehouse },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
