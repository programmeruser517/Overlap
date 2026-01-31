import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Allowlist gate + routing only. No business logic.
 * Stub: allow all; later add auth checks for /app and /api.
 */
const PUBLIC_PATHS = ["/", "/login"];
const APP_PATHS = ["/app", "/app/", "/app/settings"];
const API_PREFIX = "/api";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public and static
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Allow API (auth checked in route handlers for now)
  if (pathname.startsWith(API_PREFIX)) {
    return NextResponse.next();
  }

  // Allow app routes (auth checked per-route for now)
  if (APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
