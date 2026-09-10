import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../../modules/notifications/store";
import { approveReturn } from "../../../../../modules/returns/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.cancel");
    const returnRequest = approveReturn(params.id, session.userId);

    recordAudit({
      action: "returns.approve",
      entityType: "return",
      entityId: returnRequest.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { status: returnRequest.status },
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager"],
      type: "return.approved",
      title: "Return approved",
      message: `${returnRequest.returnNumber} was approved — waiting on the package back`,
      href: `/returns/${returnRequest.id}`,
    });

    return NextResponse.json({ return: returnRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
