import Stripe from "stripe";
import { ConfigurationError } from "../shared/errors";

let cachedClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConfigurationError(
      "Stripe is not configured yet. Add STRIPE_SECRET_KEY (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET) to run checkout."
    );
  }
  if (!cachedClient) {
    cachedClient = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  }
  return cachedClient;
}

/**
 * Stripe does not support Nigerian Naira as a presentment currency on a
 * standard (non-Nigerian) account, so test-mode PaymentIntents run in
 * USD -- converted at the same NGN:USD rate the CSV catalog import used
 * (modules/catalog/csv-import.json), then to the smallest currency unit
 * (cents). This is a real constraint worth knowing about before going
 * live: a Nigerian storefront charging in USD via Stripe is unusual --
 * Paystack (which Stripe owns) or Flutterwave are the standard choice
 * for NGN-settled Nigerian payments. Swap this conversion out if the
 * eventual processor differs.
 */
const NGN_PER_USD = 1500;

export function nairaToStripeAmount(nairaTotal: number): { amount: number; currency: string } {
  const usd = nairaTotal / NGN_PER_USD;
  return { amount: Math.round(usd * 100), currency: "usd" };
}
