import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { cancelOrder, requireOrder } from "../../../../../modules/orders/store";
import { parseReason } from "../../../../../modules/orders/validation";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { createNotification } from "../../../../../modules/notifications/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.cancel");
    const body = await request.json().catch(() => ({}));
    const reason = parseReason(body?.reason, "Cancellation reason");

    const before = requireOrder(params.id);
    const order = cancelOrder(params.id, session.userId, reason);

    recordAudit({
      action: "orders.cancel",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status },
      reason: reason ?? undefined,
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager"],
      type: "order.cancelled",
      title: "Order cancelled",
      message: `Order #${order.orderNumber} was cancelled${reason ? ` — ${reason}` : ""}`,
      href: `/orders/${order.id}`,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
