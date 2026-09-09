import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { rejectReturn } from "../../../../../modules/returns/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.cancel");
    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === "string" ? body.note.trim() || null : null;

    const returnRequest = rejectReturn(params.id, session.userId, note);

    recordAudit({
      action: "returns.reject",
      entityType: "return",
      entityId: returnRequest.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { status: returnRequest.status, note },
    });

    return NextResponse.json({ return: returnRequest });
  } catch (error) {
    return handleApiError(error);
  }
}
