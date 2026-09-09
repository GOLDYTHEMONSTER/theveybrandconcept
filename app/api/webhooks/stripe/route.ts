import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { createNotification } from "../../../../modules/notifications/store";
import {
  findOrderByPaymentIntent,
  markPaymentFailed,
  markPaymentRefunded,
  markPaymentSucceeded,
} from "../../../../modules/orders/store";
import { getStripeClient } from "../../../../modules/payments/stripe";

export const runtime = "nodejs";

/**
 * Stripe calls this directly from its own servers -- there is no
 * browser session, no same-origin header, and no CSRF concern the way
 * every other mutation route has one. Authenticity comes entirely from
 * the signature check below (constructEvent throws if the body doesn't
 * match STRIPE_WEBHOOK_SECRET), which is why this route deliberately
 * skips requireSameOrigin/guardMutation rather than being an oversight.
 *
 * Configure this in the Stripe dashboard (or `stripe listen --forward-to
 * .../api/webhooks/stripe` for local testing) for at least:
 *   payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("[stripe webhook] missing signature header or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const order = findOrderByPaymentIntent(paymentIntent.id);
        if (!order) break;

        const before = order.paymentStatus;
        const updated = markPaymentSucceeded(order.id);
        if (before !== "paid") {
          recordAudit({
            action: "orders.payment_succeeded",
            entityType: "order",
            entityId: updated.id,
            actorId: "stripe-webhook",
            actorName: "Stripe",
            beforeValue: { paymentStatus: before },
            afterValue: { paymentStatus: updated.paymentStatus, status: updated.status },
          });
          createNotification({
            audienceRoles: ["executive", "sales_manager", "warehouse_manager"],
            type: "order.created",
            title: "Payment confirmed",
            message: `Order #${updated.orderNumber} is paid — ₦${updated.total.toLocaleString("en-NG")}`,
            href: `/orders/${updated.id}`,
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const order = findOrderByPaymentIntent(paymentIntent.id);
        if (!order) break;

        const before = order.paymentStatus;
        const updated = markPaymentFailed(order.id);
        if (before !== "failed") {
          recordAudit({
            action: "orders.payment_failed",
            entityType: "order",
            entityId: updated.id,
            actorId: "stripe-webhook",
            actorName: "Stripe",
            beforeValue: { paymentStatus: before },
            afterValue: { paymentStatus: updated.paymentStatus, status: updated.status, reason: paymentIntent.last_payment_error?.message ?? null },
          });
          createNotification({
            audienceRoles: ["executive", "sales_manager"],
            type: "order.cancelled",
            title: "Payment failed",
            message: `Order #${updated.orderNumber}'s payment failed and was cancelled automatically`,
            href: `/orders/${updated.id}`,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        const order = paymentIntentId ? findOrderByPaymentIntent(paymentIntentId) : undefined;
        if (!order) break;

        const before = order.paymentStatus;
        const updated = markPaymentRefunded(order.id);
        if (before !== "refunded") {
          recordAudit({
            action: "orders.refunded",
            entityType: "order",
            entityId: updated.id,
            actorId: "stripe-webhook",
            actorName: "Stripe",
            beforeValue: { paymentStatus: before },
            afterValue: { paymentStatus: updated.paymentStatus, status: updated.status, amountRefunded: charge.amount_refunded },
          });
          createNotification({
            audienceRoles: ["executive", "sales_manager"],
            type: "order.cancelled",
            title: "Order refunded",
            message: `Order #${updated.orderNumber} was refunded via Stripe`,
            href: `/orders/${updated.id}`,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // Stripe retries on non-2xx, but a bug in our own handling shouldn't
    // trigger endless retries of an event Stripe already delivered fine.
    console.error(`[stripe webhook] handler error for ${event.type}`, error);
  }

  return NextResponse.json({ received: true });
}
