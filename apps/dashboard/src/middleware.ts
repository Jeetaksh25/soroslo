import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "soroslo_session";

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const authRequired =
    process.env.SOROSLO_REQUIRE_AUTH === "true" ||
    !isLoopbackHostname(request.nextUrl.hostname);

  if (!authRequired) {
    return NextResponse.next();
  }

  const expectedToken = process.env.SOROSLO_ADMIN_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      {
        error: "dashboard_auth_misconfigured",
        message: "SOROSLO_REQUIRE_AUTH requires SOROSLO_ADMIN_TOKEN"
      },
      { status: 503 }
    );
  }

  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const supplied = authorization.slice("Bearer ".length);
    if ((await sha256(supplied)) === (await sha256(expectedToken))) {
      return NextResponse.next();
    }
  }

  const expectedSession = await sha256(`soroslo-dashboard:${expectedToken}`);
  if (request.cookies.get(SESSION_COOKIE)?.value === expectedSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "A valid SoroSLO administrator session is required"
      },
      {
        status: 401,
        headers: {
          "www-authenticate": 'Bearer realm="SoroSLO Dashboard"'
        }
      }
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
