import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { addShipmentEvent, requireOrder } from "../../../../../modules/orders/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.fulfil");
    const body = await request.json().catch(() => ({}));

    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : null;

    if (!status || !message) {
      throw new ValidationError("Status and message are required");
    }

    const order = requireOrder(params.id);
    const shipment = addShipmentEvent(params.id, { status, location, message });

    recordAudit({
      action: "orders.tracking_update",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { status, location, message },
    });

    return NextResponse.json({ shipment });
  } catch (error) {
    return handleApiError(error);
  }
}
