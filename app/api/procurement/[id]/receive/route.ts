import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { getPurchaseOrder, receivePurchaseOrder } from "../../../../../modules/procurement/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "inventory.adjust");

    const before = getPurchaseOrder(params.id);
    const order = receivePurchaseOrder(params.id, session.userId);

    recordAudit({
      action: "procurement.receive",
      entityType: "purchase_order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status, quantity: order.quantity, warehouse: order.warehouse },
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager"],
      type: "procurement.received",
      title: "Purchase order received",
      message: `${order.quantity} × ${order.productName} received into ${order.warehouse} (PO-${order.poNumber})`,
      href: `/inventory/product/${order.productId}`,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
