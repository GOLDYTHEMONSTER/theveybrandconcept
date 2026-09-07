import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { markDelivered, requireOrder } from "../../../../../modules/orders/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");
    const before = requireOrder(params.id);
    const order = markDelivered(params.id, session.userId);

    recordAudit({
      action: "orders.deliver",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      beforeValue: { status: before.status },
      afterValue: { status: order.status },
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
