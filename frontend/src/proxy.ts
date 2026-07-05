import { type NextRequest, NextResponse } from "next/server";

const AUTH_PREFIX = "/auth";
const APP_PATH = "/app";
const DEFAULT_AUTHENTICATED_PATH = "/psychologists";
const DASHBOARD_PATH = "/dashboard";
const TOKEN_COOKIE_NAME = process.env.NEXT_PUBLIC_TOKEN_LOCAL || "lectum.token";
const USER_COOKIE_NAME = process.env.NEXT_PUBLIC_USER_LOCAL || "lectum.user";

const PUBLIC_ROUTES = ["/auth/profile-selection", "/auth/login", "/auth/redirect", "/auth/error"];
const AUTH_REQUIRED_ROUTES = ["/auth/verify-email"];
const AUTH_RESULT_ROUTES = ["/auth/redirect", "/auth/error"];
const PRIVATE_PREFIXES = [DASHBOARD_PATH, APP_PATH, "/patient"];
const INLINE_AUTH_PROMPT_ROUTES = ["/app/favorites", "/app/notifications", "/app/profile"];
const PUBLIC_APP_EXACT_ROUTES = [
  "/app/psychologists",
  "/app/community",
  "/app/community/top-mentors",
];
const PUBLIC_APP_PREFIXES = ["/app/psychologists/", "/app/psychologist/"];

const isPublicCommunityRoute = (pathname: string) => {
  if (PUBLIC_APP_EXACT_ROUTES.includes(pathname)) return true;
  if (!pathname.startsWith("/app/community/")) return false;
  if (pathname.startsWith("/app/community/suggest")) return false;
  if (pathname === "/app/community/post/new") return false;
  if (pathname.includes("/post/new")) return false;
  if (pathname.includes("/post/success")) return false;

  return true;
};

const clearRootCookie = (response: NextResponse, name: string) => {
  response.cookies.set(name, "", {
    maxAge: 0,
    path: "/",
  });
};

const hasPendingEmailConfirmation = (req: NextRequest) => {
  const rawUserCookie = req.cookies.get(USER_COOKIE_NAME)?.value;
  if (!rawUserCookie) return false;

  const candidates = [rawUserCookie];

  try {
    candidates.push(decodeURIComponent(rawUserCookie));
  } catch {
    // Keeps the original cookie value as the only parsing candidate.
  }

  return candidates.some((candidate) => {
    try {
      const value = JSON.parse(candidate) as { confirm?: boolean };
      return value.confirm === true;
    } catch {
      return false;
    }
  });
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const currentPathWithSearch = `${pathname}${req.nextUrl.search}`;
  const token = req.cookies.get(TOKEN_COOKIE_NAME);
  const pendingEmailConfirmation = Boolean(token) && hasPendingEmailConfirmation(req);

  const isAuthRoute = pathname.startsWith(AUTH_PREFIX);
  const isPublicAppRoute =
    PUBLIC_APP_EXACT_ROUTES.includes(pathname) ||
    isPublicCommunityRoute(pathname) ||
    PUBLIC_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || isPublicAppRoute;
  const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.includes(pathname);
  const isAuthResultRoute = AUTH_RESULT_ROUTES.includes(pathname);
  const isPrivateRoute = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isInlineAuthPromptRoute = INLINE_AUTH_PROMPT_ROUTES.includes(pathname);

  if (isAuthResultRoute) {
    const response = NextResponse.next();

    if (pathname === "/auth/error" && req.nextUrl.searchParams.get("clearSession") === "1") {
      clearRootCookie(response, TOKEN_COOKIE_NAME);
      clearRootCookie(response, USER_COOKIE_NAME);
    }

    return response;
  }

  if (pendingEmailConfirmation && !isAuthRequiredRoute && (isAuthRoute || isPrivateRoute)) {
    return NextResponse.redirect(new URL("/auth/verify-email", req.url));
  }

  if (token && isAuthRoute && !isAuthRequiredRoute) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_PATH, req.url));
  }

  if (!token && isAuthRequiredRoute) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", currentPathWithSearch);
    return NextResponse.redirect(loginUrl);
  }

  if (!token && isPrivateRoute && !isPublicRoute && !isInlineAuthPromptRoute) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", currentPathWithSearch);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|svg).*)"],
};
