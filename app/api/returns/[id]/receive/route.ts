import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { markReturnReceived } from "../../../../../modules/returns/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";

/** The one step that actually moves stock -- restocks every returned line back into inventory. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");
    const returnRequest = markReturnReceived(params.id, session.userId);

    recordAudit({
      action: "returns.receive",
      entityType: "return",
      entityId: returnRequest.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { status: returnRequest.status, items: returnRequest.items.map((i) => ({ sku: i.sku, quantity: i.quantity })) },
    });

    createNotification({
      audienceRoles: ["executive", "sales_manager"],
      type: "return.requested",
      title: "Return received",
      message: `${returnRequest.returnNumber} was received and restocked — ready to refund`,
      href: `/returns/${returnRequest.id}`,
    });

    return NextResponse.json({ return: returnRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
