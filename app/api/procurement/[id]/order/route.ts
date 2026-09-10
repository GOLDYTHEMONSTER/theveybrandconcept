import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { getPurchaseOrder, markOrdered } from "../../../../../modules/procurement/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "inventory.adjust");

    const before = getPurchaseOrder(params.id);
    const order = markOrdered(params.id);

    recordAudit({
      action: "procurement.order",
      entityType: "purchase_order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status, expectedDate: order.expectedDate },
    });

    createNotification({
      audienceRoles: ["executive"],
      type: "procurement.ordered",
      title: "Purchase order placed",
      message: `PO-${order.poNumber} for ${order.quantity} × ${order.productName} was placed with ${order.supplier}`,
      href: "/procurement",
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
