import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
  if (a !== undefined && a >= 224) return true;
  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return false;
}

export async function assertWebhookTargetAllowed(
  value: string,
  options: { allowPrivateNetwork?: boolean } = {}
): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new TypeError("Webhook URL must use HTTPS");
  }

  if (url.username || url.password) {
    throw new TypeError("Webhook URL must not contain embedded credentials");
  }

  if (options.allowPrivateNetwork) return url;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new TypeError("Webhook URL must not target localhost");
  }

  if (isIP(hostname) !== 0 && isPrivateAddress(hostname)) {
    throw new TypeError("Webhook URL must not target a private or loopback address");
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (resolved.length === 0) {
    throw new TypeError("Webhook hostname did not resolve");
  }

  if (resolved.some((entry) => isPrivateAddress(entry.address))) {
    throw new TypeError("Webhook hostname resolves to a private or loopback address");
  }

  return url;
}
