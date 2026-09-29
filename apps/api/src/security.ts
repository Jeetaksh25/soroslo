import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function bearerTokenMatches(
  authorization: string | undefined,
  expectedToken: string
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  if (!supplied) return false;
  return timingSafeEqual(digest(supplied), digest(expectedToken));
}

export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized === "localhost"
  );
}

export function assertRemoteBindIsAuthenticated(
  host: string,
  adminToken: string | undefined
): void {
  if (isLoopbackHost(host)) return;
  if (!adminToken?.trim()) {
    throw new Error(
      "Remote API bind requires SOROSLO_ADMIN_TOKEN (or ApiOptions.adminToken)"
    );
  }
}

export function requestHasBearerToken(
  request: FastifyRequest,
  expectedToken: string
): boolean {
  const authorization = request.headers.authorization;
  return bearerTokenMatches(authorization, expectedToken);
}
