import { type NextRequest, NextResponse } from "next/server";

const AUTH_PREFIX = "/auth";
const APP_PATH = "/app";
const DEFAULT_AUTHENTICATED_PATH = "/psicologos";
const DASHBOARD_PATH = "/dashboard";
const TOKEN_COOKIE_NAME = process.env.NEXT_PUBLIC_TOKEN_LOCAL || "lectum.token";
const USER_COOKIE_NAME = process.env.NEXT_PUBLIC_USER_LOCAL || "lectum.user";

const PUBLIC_ROUTES = [
  "/auth/profile-selection",
  "/auth/login",
  "/auth/redirect",
  "/auth/error",
  "/auth/admin-view-as",
];
const AUTH_REQUIRED_ROUTES = ["/auth/verify-email"];
const AUTH_RESULT_ROUTES = ["/auth/redirect", "/auth/error", "/auth/admin-view-as"];
const PRIVATE_PREFIXES = [DASHBOARD_PATH, APP_PATH, "/patient", "/paciente"];
const INLINE_AUTH_PROMPT_ROUTES = ["/app/favoritos", "/app/notificacoes", "/app/perfil"];
const PUBLIC_APP_EXACT_ROUTES = [
  "/app/psicologos",
  "/app/psychologists",
  "/app/community",
  "/app/comunidades",
  "/app/community/top-mentors",
  "/app/comunidades/top-mentores",
];
const PUBLIC_APP_PREFIXES = [
  "/app/psicologos/",
  "/app/psychologists/",
  "/app/psicologo/",
  "/app/psychologist/",
];
const LEGACY_PRIVATE_REDIRECTS = new Map<string, string>([
  ["/patient/welcome", "/paciente/boas-vindas"],
  ["/app/account/need-reset", "/app/conta/redefinir-senha"],
  ["/app/settings/notifications", "/app/configuracoes/notificacoes"],
  ["/app/settings/account", "/app/configuracoes/conta"],
  ["/app/profile/edit", "/app/perfil/editar"],
  ["/app/profile", "/app/perfil"],
  ["/app/notifications", "/app/notificacoes"],
  ["/app/favorites", "/app/favoritos"],
  ["/app/following", "/app/comunidades-seguidas"],
  ["/app/posts/mine", "/app/publicacoes/minhas"],
  ["/app/posts/saved", "/app/publicacoes/salvas"],
  ["/app/reviews/success", "/app/avaliacoes/sucesso"],
  ["/app/reviews/new", "/app/avaliacoes/nova"],
  ["/app/reviews", "/app/avaliacoes"],
  ["/app/professional/profile/setup", "/app/profissional/perfil/configurar"],
  ["/app/professional/billing/subscription", "/app/profissional/assinatura/gerenciar"],
  ["/app/professional/billing/checkout", "/app/profissional/assinatura/pagamento"],
  ["/app/professional/billing/address", "/app/profissional/assinatura/endereco"],
  ["/app/professional/billing/card", "/app/profissional/assinatura/cartao"],
  ["/app/professional/billing/plans", "/app/profissional/assinatura/planos"],
  ["/app/professional/billing", "/app/profissional/assinatura"],
  ["/app/professional/analytics", "/app/profissional/estatisticas"],
  ["/app/professional/reviews", "/app/profissional/avaliacoes"],
  ["/app/professional/whatsapp/verify", "/app/profissional/whatsapp/verificar"],
  ["/app/professional/cfp", "/app/profissional/cfp"],
  ["/app/psychologists", "/app/psicologos"],
  ["/app/community/suggest/success", "/app/comunidades/sugerir/sucesso"],
  ["/app/community/suggest", "/app/comunidades/sugerir"],
  ["/app/community/top-mentors", "/app/comunidades/top-mentores"],
  ["/app/community/post/new", "/app/comunidades/publicacao/nova"],
  ["/app/community", "/app/comunidades"],
]);

const isPathOrDescendant = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const resolveLegacyPrivateRedirect = (pathname: string) => {
  const exact = LEGACY_PRIVATE_REDIRECTS.get(pathname);
  if (exact) return exact;

  const psychologistContactMatch = pathname.match(/^\/app\/psychologist\/([^/]+)\/contact$/);
  if (psychologistContactMatch) return `/app/psicologo/${psychologistContactMatch[1]}/contato`;

  const psychologistMatch = pathname.match(/^\/app\/psychologist\/([^/]+)$/);
  if (psychologistMatch) return `/app/psicologo/${psychologistMatch[1]}`;

  const communityThreadMatch = pathname.match(
    /^\/app\/community\/([^/]+)\/post\/([^/]+)\/thread\/([^/]+)$/,
  );
  if (communityThreadMatch) {
    return `/app/comunidades/${communityThreadMatch[1]}/publicacao/${communityThreadMatch[2]}/resposta/${communityThreadMatch[3]}`;
  }

  const communityCreateMatch = pathname.match(/^\/app\/community\/([^/]+)\/post\/new$/);
  if (communityCreateMatch) return `/app/comunidades/${communityCreateMatch[1]}/publicacao/nova`;

  const communitySuccessMatch = pathname.match(/^\/app\/community\/([^/]+)\/post\/success$/);
  if (communitySuccessMatch)
    return `/app/comunidades/${communitySuccessMatch[1]}/publicacao/sucesso`;

  const communityPostMatch = pathname.match(/^\/app\/community\/([^/]+)\/post\/([^/]+)$/);
  if (communityPostMatch)
    return `/app/comunidades/${communityPostMatch[1]}/publicacao/${communityPostMatch[2]}`;

  const communityMatch = pathname.match(/^\/app\/community\/([^/]+)$/);
  if (communityMatch) return `/app/comunidades/${communityMatch[1]}`;

  return null;
};

const isPublicCommunityRoute = (pathname: string) => {
  if (PUBLIC_APP_EXACT_ROUTES.includes(pathname)) return true;
  const isCommunityPath =
    pathname.startsWith("/app/community/") || pathname.startsWith("/app/comunidades/");
  if (!isCommunityPath) return false;
  if (pathname.startsWith("/app/comunidades/sugerir")) return false;
  if (pathname.startsWith("/app/community/suggest")) return false;
  if (pathname === "/app/comunidades/publicacao/nova") return false;
  if (pathname === "/app/community/post/new") return false;
  if (pathname.includes("/publicacao/nova")) return false;
  if (pathname.includes("/publicacao/sucesso")) return false;
  if (pathname.includes("/post/new")) return false;
  if (pathname.includes("/post/success")) return false;

  return true;
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
  const legacyPrivateRedirect = resolveLegacyPrivateRedirect(pathname);

  if (legacyPrivateRedirect) {
    const url = req.nextUrl.clone();
    url.pathname = legacyPrivateRedirect;

    return NextResponse.redirect(url, 308);
  }

  const token = req.cookies.get(TOKEN_COOKIE_NAME);
  const pendingEmailConfirmation = Boolean(token) && hasPendingEmailConfirmation(req);

  const isAuthRoute = isPathOrDescendant(pathname, AUTH_PREFIX);
  const isPublicAppRoute =
    PUBLIC_APP_EXACT_ROUTES.includes(pathname) ||
    isPublicCommunityRoute(pathname) ||
    PUBLIC_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || isPublicAppRoute;
  const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.includes(pathname);
  const isAuthResultRoute = AUTH_RESULT_ROUTES.includes(pathname);
  const isPrivateRoute = PRIVATE_PREFIXES.some((prefix) => isPathOrDescendant(pathname, prefix));
  const isInlineAuthPromptRoute = INLINE_AUTH_PROMPT_ROUTES.includes(pathname);

  if (isAuthResultRoute) {
    return NextResponse.next();
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
