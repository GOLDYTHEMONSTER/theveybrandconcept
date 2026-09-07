import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
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

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
