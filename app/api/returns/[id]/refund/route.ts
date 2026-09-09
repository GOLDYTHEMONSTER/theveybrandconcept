import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../../modules/audit/sandbox-log";
import { getOrder, markPaymentRefunded } from "../../../../../modules/orders/store";
import { getStripeClient, nairaToStripeAmount } from "../../../../../modules/payments/stripe";
import { listReturnsForOrder, markReturnRefunded, requireReturn } from "../../../../../modules/returns/store";
import { guardMutation, handleApiError } from "../../../../../modules/security/api-guard";
import { ValidationError } from "../../../../../modules/shared/errors";

/**
 * order.paymentStatus is binary (paid/refunded/...), so it only flips to
 * "refunded" once this return -- combined with any other already-
 * refunded returns on the same order -- accounts for the full order
 * total. A genuinely partial refund leaves the order "paid"; the
 * return's own "refunded" status plus this Stripe refund are the
 * source of truth for that partial amount, not order.paymentStatus.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await guardMutation(request, "orders.cancel");

    const returnRequest = requireReturn(params.id);
    if (returnRequest.status !== "received") {
      throw new ValidationError(`Cannot refund a return with status "${returnRequest.status}" — it must be received first`);
    }

    const order = getOrder(returnRequest.orderId);
    if (!order?.paymentIntentId) throw new ValidationError("This order was never charged through Stripe");

    const { amount } = nairaToStripeAmount(returnRequest.refundAmount);
    const refund = await getStripeClient().refunds.create({ payment_intent: order.paymentIntentId, amount });

    const updated = markReturnRefunded(returnRequest.id, session.userId, refund.id);

    const refundedSoFar = listReturnsForOrder(order.id)
      .filter((r) => r.status === "refunded")
      .reduce((sum, r) => sum + r.refundAmount, 0);
    if (refundedSoFar >= order.total) {
      markPaymentRefunded(order.id, session.userId);
    }

    recordAudit({
      action: "returns.refund",
      entityType: "return",
      entityId: updated.id,
      actorId: session.userId,
      actorName: session.name,
      afterValue: { refundId: refund.id, amount: returnRequest.refundAmount, orderFullyRefunded: refundedSoFar >= order.total },
    });

    return NextResponse.json({ return: updated, refundId: refund.id });
  } catch (error) {
    return handleApiError(error);
  }
}
