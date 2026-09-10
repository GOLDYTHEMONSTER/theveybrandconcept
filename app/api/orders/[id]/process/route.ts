import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { requireOrder, startProcessing } from "../../../../../modules/orders/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");
    const before = requireOrder(params.id);
    const order = startProcessing(params.id, session.userId);

    recordAudit({
      action: "orders.process",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status },
    });

    createNotification({
      audienceRoles: ["sales_manager"],
      type: "order.processing",
      title: "Order in fulfilment",
      message: `Order #${order.orderNumber} is being packed`,
      href: `/orders/${order.id}`,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
