import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../modules/notifications/store";
import { getShipmentByToken } from "../../../../modules/orders/store";
import { RETURN_REASONS, type ReturnReason } from "../../../../modules/returns/domain";
import { createReturn } from "../../../../modules/returns/store";
import { RATE_LIMIT_RULES, RateLimitExceededError, requireRateLimit } from "../../../../lib/rate-limit/limiter";
import { getClientIp, InvalidRequestOriginError, requireSameOrigin } from "../../../../modules/security/request";
import { ConflictError, NotFoundError, ValidationError } from "../../../../modules/shared/errors";

/**
 * Self-service return request from the public tracking page (app/track/
 * [token]) -- keyed by the shipment's public token, the same way that
 * page already avoids exposing the real order id (see getShipmentByToken).
 * No session exists here, same as storefront checkout, so this runs the
 * same-origin + rate-limit pair instead of guardMutation().
 */
export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  try {
    requireSameOrigin(request);
    await requireRateLimit(RATE_LIMIT_RULES.returns, ipAddress ?? "unknown");

    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) throw new ValidationError("Missing tracking token");

    const found = getShipmentByToken(token);
    if (!found) throw new NotFoundError("We couldn't find that order");
    const { order } = found;

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

    const returnRequest = createReturn({ orderId: order.id, items, reason, reasonNote }, "storefront-customer", order.customer);

    recordAudit({
      action: "returns.create",
      entityType: "return",
      entityId: returnRequest.id,
      actorId: "storefront-customer",
      actorName: order.customer,
      afterValue: { orderId: order.id, returnNumber: returnRequest.returnNumber, reason, refundAmount: returnRequest.refundAmount },
    });

    createNotification({
      audienceRoles: ["executive", "sales_manager"],
      type: "return.requested",
      title: "Return requested",
      message: `${order.customer} requested a return for order #${order.orderNumber}`,
      href: `/returns/${returnRequest.id}`,
    });

    return NextResponse.json({ returnNumber: returnRequest.returnNumber, status: returnRequest.status }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidRequestOriginError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": Math.ceil((error.resetAt - Date.now()) / 1000).toString() } }
      );
    }
    if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("[returns public] failed", error);
    return NextResponse.json({ error: "Could not submit your return request. Please try again." }, { status: 500 });
  }
}
