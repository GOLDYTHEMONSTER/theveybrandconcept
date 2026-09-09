import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "../../../../modules/audit/sandbox-log";
import { findVariantBySku } from "../../../../modules/catalog/store";
import { attachPaymentIntent, cancelOrder, createOrder } from "../../../../modules/orders/store";
import { createNotification } from "../../../../modules/notifications/store";
import { getStripeClient, isStripeConfigured, nairaToStripeAmount } from "../../../../modules/payments/stripe";
import { RATE_LIMIT_RULES, RateLimitExceededError, requireRateLimit } from "../../../../lib/rate-limit/limiter";
import { getClientIp, InvalidRequestOriginError, requireSameOrigin } from "../../../../modules/security/request";
import { ConfigurationError, ConflictError, InsufficientStockError, NotFoundError, ValidationError } from "../../../../modules/shared/errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CheckoutBody {
  customer: { name: string; email: string; address?: string; city?: string; postcode?: string };
  items: Array<{ sku: string; quantity: number }>;
}

function parseCheckoutBody(input: unknown): CheckoutBody {
  if (!input || typeof input !== "object") throw new ValidationError("Order details are required");
  const candidate = input as Record<string, unknown>;

  const customerRaw = candidate.customer;
  if (!customerRaw || typeof customerRaw !== "object") throw new ValidationError("Customer details are required");
  const customer = customerRaw as Record<string, unknown>;
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 120) throw new ValidationError("Full name is required");
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError("A valid email is required");

  if (!Array.isArray(candidate.items) || candidate.items.length === 0) {
    throw new ValidationError("Your bag is empty");
  }
  const items = candidate.items.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new ValidationError(`Item ${index + 1} is invalid`);
    const item = raw as Record<string, unknown>;
    const sku = typeof item.sku === "string" ? item.sku.trim() : "";
    const quantity = typeof item.quantity === "string" ? Number(item.quantity) : item.quantity;
    if (!sku) throw new ValidationError(`Item ${index + 1} is missing a product reference`);
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      throw new ValidationError(`Item ${index + 1} has an invalid quantity`);
    }
    return { sku, quantity };
  });

  return {
    customer: {
      name,
      email,
      address: typeof customer.address === "string" ? customer.address.trim() : undefined,
      city: typeof customer.city === "string" ? customer.city.trim() : undefined,
      postcode: typeof customer.postcode === "string" ? customer.postcode.trim() : undefined,
    },
    items,
  };
}

/**
 * Public checkout endpoint for the storefront (app/store). No ERP
 * session exists here — a customer isn't a staff member — so this does
 * NOT use guardMutation(). It still runs the same-origin check, rate
 * limiting, and strict input validation every mutation needs; the
 * resulting order is otherwise indistinguishable from one entered by
 * staff and shows up immediately in ERP Orders/Inventory.
 */
export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  let createdOrderId: string | null = null;
  try {
    requireSameOrigin(request);
    await requireRateLimit(RATE_LIMIT_RULES.checkout, ipAddress ?? "unknown");

    if (!isStripeConfigured()) {
      throw new ConfigurationError("Payment processing is not set up yet — checkout is unavailable until Stripe test keys are added.");
    }

    const body = parseCheckoutBody(await request.json());
    const items = body.items.map((item) => {
      const variant = findVariantBySku(item.sku);
      if (!variant) throw new NotFoundError(`"${item.sku}" is no longer available`);
      return { variantId: variant.id, quantity: item.quantity };
    });

    // Stock is reserved the moment the order is created (see createOrder),
    // same as before Stripe existed. If PaymentIntent creation fails below,
    // the order is cancelled immediately so that reservation doesn't sit
    // there indefinitely for a payment that was never even attempted.
    const order = createOrder({ customer: body.customer.name, customerEmail: body.customer.email, channel: "Online store", items }, "storefront-customer");
    createdOrderId = order.id;

    const { amount, currency } = nairaToStripeAmount(order.total);
    const paymentIntent = await getStripeClient().paymentIntents.create({
      amount,
      currency,
      receipt_email: body.customer.email,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, nairaTotal: String(order.total) },
      automatic_payment_methods: { enabled: true },
    });
    attachPaymentIntent(order.id, paymentIntent.id, paymentIntent.client_secret);

    recordAudit({
      action: "storefront.checkout",
      entityType: "order",
      entityId: order.id,
      actorId: "storefront-customer",
      actorName: body.customer.name,
      afterValue: { orderNumber: order.orderNumber, email: body.customer.email, total: order.total, items: order.items.length, paymentIntentId: paymentIntent.id },
    });

    createNotification({
      audienceRoles: ["executive", "warehouse_manager", "sales_manager"],
      type: "storefront.order",
      title: "New online order",
      message: `${body.customer.name} placed order #${order.orderNumber} — ₦${order.total.toLocaleString("en-NG")} (awaiting payment)`,
      href: `/orders/${order.id}`,
    });

    return NextResponse.json(
      { orderNumber: order.orderNumber, total: order.total, clientSecret: paymentIntent.client_secret },
      { status: 201 }
    );
  } catch (error) {
    if (createdOrderId) {
      try {
        cancelOrder(createdOrderId, "storefront-customer", "Checkout failed before payment could be started");
      } catch {
        // best-effort cleanup only
      }
    }
    if (error instanceof InvalidRequestOriginError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": Math.ceil((error.resetAt - Date.now()) / 1000).toString() } }
      );
    }
    if (error instanceof ConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ConflictError || error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[storefront checkout] failed", error);
    return NextResponse.json({ error: "Could not place your order. Please try again." }, { status: 500 });
  }
}
