import { createHmac } from "node:crypto";

export function signWebhookBody(secret: string, timestamp: string, body: string): string {
  if (!secret) throw new TypeError("Webhook secret must not be empty");

  const digest = createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest("hex");

  return `sha256=${digest}`;
}
