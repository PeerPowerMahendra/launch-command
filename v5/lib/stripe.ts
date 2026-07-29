import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy Stripe client. Null when STRIPE_SECRET_KEY is not set (Phase 4 wiring). */
export function stripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Phase 4 stub. Returns a checkout URL once Stripe + price IDs are wired;
 * until then it signals "not configured" so the UI shows a waitlist CTA.
 */
export async function createCheckoutSession(_priceId: string, _customerId?: string): Promise<
  { url: string } | { error: "not_configured" }
> {
  const s = stripe();
  if (!s) return { error: "not_configured" };
  // Wiring completed in Phase 4:
  //   const session = await s.checkout.sessions.create({ ... });
  //   return { url: session.url! };
  return { error: "not_configured" };
}
