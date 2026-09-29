import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function matchesToken(supplied: string, expected: string): boolean {
  return timingSafeEqual(digest(supplied), digest(expected));
}

function sessionValue(token: string): string {
  return createHash("sha256").update("soroslo-dashboard:").update(token).digest("hex");
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.SOROSLO_REQUIRE_AUTH !== "true") {
    return Response.json({ status: "auth_not_required" });
  }

  const expected = process.env.SOROSLO_ADMIN_TOKEN;
  if (!expected) {
    return Response.json(
      {
        error: "dashboard_auth_misconfigured",
        message: "SOROSLO_ADMIN_TOKEN is not configured"
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    typeof (body as Record<string, unknown>).token === "string"
      ? (body as Record<string, unknown>).token
      : "";

  if (!token || !matchesToken(token, expected)) {
    return Response.json(
      {
        error: "unauthorized",
        message: "Invalid administrator token"
      },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("soroslo_session", sessionValue(expected), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.SOROSLO_COOKIE_SECURE === "true",
    path: "/"
  });

  return Response.json({ status: "authenticated" });
}
