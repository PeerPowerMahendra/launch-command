import { PostHog } from "posthog-node";

let _ph: PostHog | null = null;

function ph(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_ph) {
    _ph = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _ph;
}

/** Server-side event capture. No-op when PostHog is not configured. */
export async function capture(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = ph();
  if (!client) return;
  client.capture({ distinctId, event, properties });
  await client.flush().catch(() => {});
}
