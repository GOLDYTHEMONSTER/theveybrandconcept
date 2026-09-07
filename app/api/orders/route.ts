import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../modules/audit/sandbox-log";
import { createOrder } from "../../../modules/orders/store";
import { parseCreateOrderInput } from "../../../modules/orders/validation";
import { guardMutation, handleApiError } from "../../../modules/security/api-guard";
import { createNotification } from "../../../modules/notifications/store";

export async function POST(request: NextRequest) {
  try {
    const session = await guardMutation(request, "orders.create");
    const input = parseCreateOrderInput(await request.json());

    const order = createOrder(input, session.userId);

    recordAudit({
      action: "orders.create",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { orderNumber: order.orderNumber, customer: order.customer, total: order.total, items: order.items.length },
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager"],
      type: "order.created",
      title: "New order",
      message: `Order #${order.orderNumber} for ${order.customer} — ₦${order.total.toLocaleString("en-NG")}`,
      href: `/orders/${order.id}`,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
