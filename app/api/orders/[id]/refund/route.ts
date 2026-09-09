import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { getOrder } from "../../../../../modules/orders/store";
import { getStripeClient } from "../../../../../modules/payments/stripe";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { NotFoundError, ValidationError } from "../../../../../modules/shared/errors";

/**
 * Only *requests* the refund from Stripe -- order.paymentStatus doesn't
 * flip to "refunded" here. That happens when Stripe's charge.refunded
 * webhook lands (app/api/webhooks/stripe), the same as it would if the
 * refund had instead been issued from the Stripe dashboard. Two sources
 * writing "refunded" independently is how that field drifts from what
 * Stripe actually did.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.cancel");

    const order = getOrder(params.id);
    if (!order) throw new NotFoundError("Order not found");
    if (!order.paymentIntentId) throw new ValidationError("This order was never charged through Stripe");
    if (order.paymentStatus !== "paid") throw new ValidationError(`Cannot refund an order with payment status "${order.paymentStatus}"`);

    const refund = await getStripeClient().refunds.create({ payment_intent: order.paymentIntentId });

    recordAudit({
      action: "orders.refund_requested",
      entityType: "order",
      entityId: order.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { paymentIntentId: order.paymentIntentId, refundId: refund.id, status: refund.status },
    });

    return NextResponse.json({ refundId: refund.id, status: refund.status });
  } catch (error) {
    return handleApiError(error);
  }
}
