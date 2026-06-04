import { type NextRequest, NextResponse } from "next/server";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PATH = "/dashboard";
const TOKEN_COOKIE_NAME = process.env.NEXT_PUBLIC_TOKEN_LOCAL || "lectum.token";

const PUBLIC_ROUTES = ["/auth/profile-selection", "/auth/login", "/auth/redirect", "/auth/error"];
const PRIVATE_PREFIXES = [DASHBOARD_PATH, "/app"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE_NAME);

  const isAuthRoute = pathname.startsWith(AUTH_PREFIX);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isPrivateRoute = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, req.url));
  }

  if (!token && isPrivateRoute && !isPublicRoute) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|svg).*)"],
};
