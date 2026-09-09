import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { RETURN_REASONS, type ReturnReason } from "../../../../../modules/returns/domain";
import { createReturn } from "../../../../../modules/returns/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";

/** Staff-initiated return -- e.g. support fielding a phone call. Customers use /api/returns/public instead. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.view");

    const body = (await request.json()) as Record<string, unknown>;
    const reason = body.reason as ReturnReason;
    if (!RETURN_REASONS.includes(reason)) throw new ValidationError(`reason must be one of: ${RETURN_REASONS.join(", ")}`);
    if (!Array.isArray(body.items) || body.items.length === 0) throw new ValidationError("Select at least one item to return");

    const items = body.items.map((raw) => {
      const item = raw as Record<string, unknown>;
      if (typeof item.variantId !== "string" || typeof item.quantity !== "number") {
        throw new ValidationError("Each item needs a variantId and quantity");
      }
      return { variantId: item.variantId, quantity: item.quantity };
    });

    const reasonNote = typeof body.reasonNote === "string" ? body.reasonNote.trim() || null : null;

    const returnRequest = createReturn({ orderId: params.id, items, reason, reasonNote }, session.userId);

    recordAudit({
      action: "returns.create",
      entityType: "return",
      entityId: returnRequest.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { orderId: params.id, returnNumber: returnRequest.returnNumber, reason, refundAmount: returnRequest.refundAmount },
    });

    return NextResponse.json({ return: returnRequest }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
