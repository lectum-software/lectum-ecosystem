import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_MARKER_COOKIE } from "@/lib/admin-session";

const LOGIN_PATH = "/login";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === LOGIN_PATH) return NextResponse.next();
  if (request.cookies.has(ADMIN_SESSION_MARKER_COOKIE)) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-icon.svg|logo-light.png).*)"],
};
