import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { cancelPurchaseOrder, getPurchaseOrder } from "../../../../../modules/procurement/store";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "inventory.adjust");

    const before = getPurchaseOrder(params.id);
    const order = cancelPurchaseOrder(params.id);

    recordAudit({
      action: "procurement.cancel",
      entityType: "purchase_order",
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
