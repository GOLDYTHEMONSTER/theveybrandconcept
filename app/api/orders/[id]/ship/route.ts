import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { requireOrder, shipOrder } from "../../../../../modules/orders/store";
import { parseShipOrderInput } from "../../../../../modules/orders/validation";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { createNotification } from "../../../../../modules/notifications/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");
    const input = parseShipOrderInput(await request.json());

    const before = requireOrder(params.id);
    const order = shipOrder(params.id, input, session.userId);

    recordAudit({
      action: "orders.ship",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status, carrier: input.carrier, trackingNumber: input.trackingNumber },
    });

    createNotification({
      audienceRoles: ["executive", "sales_manager"],
      type: "order.shipped",
      title: "Order shipped",
      message: `Order #${order.orderNumber} shipped via ${input.carrier} (${input.trackingNumber})`,
      href: `/orders/${order.id}`,
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
