import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { recordCarrierEvent } from "../../../../modules/orders/store";
import { NotFoundError, ValidationError } from "../../../../modules/shared/errors";

export const runtime = "nodejs";

/**
 * Stand-in for a real logistics provider's webhook (GIG Logistics, Shippo,
 * EasyPost, ...) -- none is wired up yet, so this simulates one: same
 * "no session, authenticate by shared secret instead of same-origin"
 * shape as app/api/webhooks/stripe, but with a plain header secret since
 * there's no real provider issuing a signed payload to verify yet.
 * Swapping in a real provider means replacing the auth check and the
 * body shape below -- recordCarrierEvent() and everything downstream of
 * it already matches how a real webhook would drive order/shipment state.
 *
 * The ERP's "Simulate carrier update" button (guardMutation-protected,
 * see /api/orders/[id]/simulate-tracking) calls recordCarrierEvent()
 * directly rather than looping through this HTTP endpoint, since staff
 * already have a real session -- this route exists for testing the
 * actual external-webhook path with something like `curl` or Postman.
 */
export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.SHIPPING_WEBHOOK_SECRET || "sandbox-shipping-secret";
    const providedSecret = request.headers.get("x-webhook-secret");
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const location = typeof body.location === "string" && body.location.trim() ? body.location.trim() : null;

    if (!trackingNumber || !status || !message) {
      throw new ValidationError("trackingNumber, status and message are required");
    }

    const { order, shipment } = recordCarrierEvent(trackingNumber, { status, location, message });

    recordAudit({
      action: "orders.carrier_webhook",
      entityType: "order",
      entityId: order.id,
      actorId: "carrier-webhook",
      actorName: "Logistics sandbox",
      afterValue: { status, location, message, orderStatus: order.status },
    });

    return NextResponse.json({ orderId: order.id, shipmentId: shipment.id, orderStatus: order.status });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[shipping webhook] failed", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
