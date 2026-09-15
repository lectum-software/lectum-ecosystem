import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_MARKER_COOKIE } from "@/lib/admin-session";

const LOGIN_PATH = "/login";
const VERSION_PATH = "/version";
const PUBLIC_PATHS = new Set([LOGIN_PATH, VERSION_PATH]);

export function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
  if (request.cookies.has(ADMIN_SESSION_MARKER_COOKIE)) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-icon.svg|logo-light.png).*)"],
};
