import { type RequestHandler, Router } from "express";
import apiAdminPrivateAuthHidrate from "@/modules/api/admin/private/auth/hidrate";
import apiAdminPrivateAuthLogout from "@/modules/api/admin/private/auth/logout";
import apiAdminPrivateCommunitiesDashboard from "@/modules/api/admin/private/communities/dashboard";
import apiAdminPrivateCommunitiesManage from "@/modules/api/admin/private/communities/manage";
import apiAdminPrivateDashboardExport from "@/modules/api/admin/private/dashboard/export";
import apiAdminPrivateDashboardSummary from "@/modules/api/admin/private/dashboard/summary";
import apiAdminPrivatePsychologistsBilling from "@/modules/api/admin/private/psychologists/billing";
import apiAdminPrivatePsychologistsDashboard from "@/modules/api/admin/private/psychologists/dashboard";
import apiAdminPrivatePsychologistsDetail from "@/modules/api/admin/private/psychologists/detail";
import apiAdminPrivatePsychologistsList from "@/modules/api/admin/private/psychologists/list";
import apiAdminPrivateTrafficExport from "@/modules/api/admin/private/traffic/export";
import apiAdminPrivateTrafficSummary from "@/modules/api/admin/private/traffic/summary";
import apiAdminPublicAuthLogin from "@/modules/api/admin/public/auth/login";
import privateAuth from "@/modules/api/middlewares/_auth";
import optionalAuth from "@/modules/api/middlewares/optional-auth";
import { requireRole } from "@/modules/api/middlewares/require-role";
import apiPrivateAccount from "@/modules/api/private/account";
import apiPrivateAuthCode from "@/modules/api/private/auth/code";
import apiPrivateAuthConfirm from "@/modules/api/private/auth/confirm";
import apiPrivateAuthHidrate from "@/modules/api/private/auth/hidrate";
import apiPrivateAuthNeedReset from "@/modules/api/private/auth/need_reset";
import apiPrivateAuthReset from "@/modules/api/private/auth/reset";
import apiPrivateCommunity from "@/modules/api/private/community";
import apiPrivateDirectoryPsychologists from "@/modules/api/private/directory/psychologists";
import apiPrivateNotificationClean from "@/modules/api/private/notification/clean";
import apiPrivateNotificationIndex from "@/modules/api/private/notification/index";
import apiPrivateNotificationUpdate from "@/modules/api/private/notification/update";
import apiPrivateNotificationPreferenceShow from "@/modules/api/private/notification_preference/show";
import apiPrivateNotificationPreferenceUpdate from "@/modules/api/private/notification_preference/update";
import apiPrivateNotificationSubscriptionKey from "@/modules/api/private/notification_subscription/key";
import apiPrivateNotificationSubscriptionStore from "@/modules/api/private/notification_subscription/store";
import apiPrivatePatientFavorites from "@/modules/api/private/patient/favorites";
import apiPrivatePatientFollows from "@/modules/api/private/patient/follows";
import apiPrivatePatientOnboarding from "@/modules/api/private/patient/onboarding";
import apiPrivatePatientProfile from "@/modules/api/private/patient/profile";
import apiPrivatePatientReviews from "@/modules/api/private/patient/reviews";
import apiPrivatePosts from "@/modules/api/private/posts";
import apiPrivatePsychologistAnalytics from "@/modules/api/private/psychologist/analytics";
import apiPrivatePsychologistBillingAddress from "@/modules/api/private/psychologist/billing/address";
import apiPrivatePsychologistBillingCheckout from "@/modules/api/private/psychologist/billing/checkout";
import apiPrivatePsychologistBillingCurrent from "@/modules/api/private/psychologist/billing/current";
import apiPrivatePsychologistBillingPaymentMethodSession from "@/modules/api/private/psychologist/billing/payment-method/session";
import apiPrivatePsychologistBillingPlans from "@/modules/api/private/psychologist/billing/plans";
import apiPrivatePsychologistBillingSelectFree from "@/modules/api/private/psychologist/billing/select-free";
import apiPrivatePsychologistBillingSubscription from "@/modules/api/private/psychologist/billing/subscription";
import apiPrivatePsychologistBillingSync from "@/modules/api/private/psychologist/billing/sync";
import apiPrivatePsychologistCfp from "@/modules/api/private/psychologist/cfp";
import apiPrivatePsychologistFreeProfile from "@/modules/api/private/psychologist/free-profile";
import apiPrivatePsychologistReviews from "@/modules/api/private/psychologist/reviews";
import apiPrivatePsychologistWhatsappVerification from "@/modules/api/private/psychologist/whatsapp-verification";
import apiPublicAnalyticsAction from "@/modules/api/public/analytics/action";
import apiPublicAnalyticsLocationCapture from "@/modules/api/public/analytics/location-capture";
import apiPublicAnalyticsPageView from "@/modules/api/public/analytics/page-view";
import apiPublicAuthLogin from "@/modules/api/public/auth/login";
import apiPublicAuthRecovery from "@/modules/api/public/auth/recovery";
import apiPublicAuthReset from "@/modules/api/public/auth/reset";
import apiPublicBillingWebhook from "@/modules/api/public/billing/webhook";
import apiPublicGoogleCallback from "@/modules/api/public/google/callback";
import apiPublicGoogleLink from "@/modules/api/public/google/link";
import apiPublicGoogleLogin from "@/modules/api/public/google/login";
import apiPublicGoogleMe from "@/modules/api/public/google/me";
import apiPublicUser from "@/modules/api/public/user";

const endpoint = Router();
type ExpressRouter = ReturnType<typeof Router>;
type MountHandler = ExpressRouter | RequestHandler;
type RoleGuard = "paciente" | "psicologo";
type MountedRoute = {
  path: string;
  role?: RoleGuard;
};

const mountedRoutes: MountedRoute[] = [];
const endpointUse = endpoint.use.bind(endpoint) as (
  path: string,
  ...handlers: MountHandler[]
) => void;

const mountRoute = (path: string, ...handlers: MountHandler[]) => {
  mountedRoutes.push({ path });
  endpointUse(path, ...handlers);
};

const mountRoleGuardedRoute = (path: string, role: RoleGuard, router: ExpressRouter) => {
  mountedRoutes.push({ path, role });
  endpointUse(path, privateAuth, requireRole(role), router);
};

const getExpectedRole = (path: string): RoleGuard | null => {
  if (path.startsWith("/api/private/patient/")) return "paciente";
  if (path.startsWith("/api/private/psychologist/")) return "psicologo";

  return null;
};

const assertPrivateRoleGuards = () => {
  const violations = mountedRoutes.filter((route) => {
    const expectedRole = getExpectedRole(route.path);

    return Boolean(expectedRole && route.role !== expectedRole);
  });

  if (violations.length > 0) {
    throw new Error(
      `[security] Rotas privadas sem requireRole correto: ${violations
        .map((route) => `${route.path}=>${route.role || "sem-role"}`)
        .join(", ")}`,
    );
  }
};

mountRoute("/api/private/auth/code", apiPrivateAuthCode);
mountRoute("/api/private/auth/confirm", apiPrivateAuthConfirm);
mountRoute("/api/private/auth/hidrate", apiPrivateAuthHidrate);
mountRoute("/api/private/auth/need_reset", apiPrivateAuthNeedReset);
mountRoute("/api/private/auth/reset", apiPrivateAuthReset);
mountRoute("/api/private/account", privateAuth, apiPrivateAccount);
mountRoute("/api/private/community", optionalAuth, apiPrivateCommunity);
mountRoute("/api/private/posts", optionalAuth, apiPrivatePosts);
mountRoute("/api/public/analytics/action", apiPublicAnalyticsAction);
mountRoute("/api/public/analytics/location-capture", apiPublicAnalyticsLocationCapture);
mountRoute("/api/public/analytics/page-view", apiPublicAnalyticsPageView);
mountRoute("/api/public/auth/login", apiPublicAuthLogin);
mountRoute("/api/public/auth/recovery", apiPublicAuthRecovery);
mountRoute("/api/public/auth/reset", apiPublicAuthReset);
mountRoute("/api/public/billing/webhook", apiPublicBillingWebhook);
mountRoute("/api/public/google/callback", apiPublicGoogleCallback);
mountRoute("/api/public/google/link", apiPublicGoogleLink);
mountRoute("/api/public/google/login", apiPublicGoogleLogin);
mountRoute("/api/public/google/me", apiPublicGoogleMe);
mountRoute("/api/public/user", apiPublicUser);
mountRoute("/api/admin/public/auth/login", apiAdminPublicAuthLogin);
mountRoute("/api/admin/private/auth/hidrate", apiAdminPrivateAuthHidrate);
mountRoute("/api/admin/private/auth/logout", apiAdminPrivateAuthLogout);
mountRoute("/api/admin/private/communities/dashboard", apiAdminPrivateCommunitiesDashboard);
mountRoute("/api/admin/private/communities", apiAdminPrivateCommunitiesManage);
mountRoute("/api/admin/private/dashboard/summary", apiAdminPrivateDashboardSummary);
mountRoute("/api/admin/private/dashboard/export", apiAdminPrivateDashboardExport);
mountRoute("/api/admin/private/psychologists/dashboard", apiAdminPrivatePsychologistsDashboard);
mountRoute("/api/admin/private/psychologists", apiAdminPrivatePsychologistsList);
mountRoute("/api/admin/private/psychologists", apiAdminPrivatePsychologistsDetail);
mountRoute("/api/admin/private/psychologists", apiAdminPrivatePsychologistsBilling);
mountRoute("/api/admin/private/traffic/summary", apiAdminPrivateTrafficSummary);
mountRoute("/api/admin/private/traffic/export", apiAdminPrivateTrafficExport);
mountRoute("/api/private/user/favorites", privateAuth, apiPrivatePatientFavorites);
mountRoute("/api/private/user/reviews", privateAuth, apiPrivatePatientReviews);
mountRoleGuardedRoute("/api/private/patient/favorites", "paciente", apiPrivatePatientFavorites);
mountRoleGuardedRoute("/api/private/patient/follows", "paciente", apiPrivatePatientFollows);
mountRoleGuardedRoute("/api/private/patient/profile", "paciente", apiPrivatePatientProfile);
mountRoleGuardedRoute("/api/private/patient/onboarding", "paciente", apiPrivatePatientOnboarding);
mountRoleGuardedRoute("/api/private/patient/reviews", "paciente", apiPrivatePatientReviews);
mountRoleGuardedRoute(
  "/api/private/psychologist/analytics",
  "psicologo",
  apiPrivatePsychologistAnalytics,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/plans",
  "psicologo",
  apiPrivatePsychologistBillingPlans,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/current",
  "psicologo",
  apiPrivatePsychologistBillingCurrent,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/subscription",
  "psicologo",
  apiPrivatePsychologistBillingSubscription,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/sync",
  "psicologo",
  apiPrivatePsychologistBillingSync,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/checkout",
  "psicologo",
  apiPrivatePsychologistBillingCheckout,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/payment-method/session",
  "psicologo",
  apiPrivatePsychologistBillingPaymentMethodSession,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/address",
  "psicologo",
  apiPrivatePsychologistBillingAddress,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/billing/select-free",
  "psicologo",
  apiPrivatePsychologistBillingSelectFree,
);
mountRoleGuardedRoute("/api/private/psychologist/cfp", "psicologo", apiPrivatePsychologistCfp);
mountRoleGuardedRoute(
  "/api/private/psychologist/free-profile",
  "psicologo",
  apiPrivatePsychologistFreeProfile,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/reviews",
  "psicologo",
  apiPrivatePsychologistReviews,
);
mountRoleGuardedRoute(
  "/api/private/psychologist/whatsapp/verification",
  "psicologo",
  apiPrivatePsychologistWhatsappVerification,
);
mountRoute("/api/private/directory/psychologists", apiPrivateDirectoryPsychologists);
mountRoute("/api/private/notification/clean", apiPrivateNotificationClean);
mountRoute("/api/private/notification/index", apiPrivateNotificationIndex);
mountRoute("/api/private/notification/update", apiPrivateNotificationUpdate);
mountRoute("/api/private/notification_preference/show", apiPrivateNotificationPreferenceShow);
mountRoute("/api/private/notification_preference/update", apiPrivateNotificationPreferenceUpdate);
mountRoute("/api/private/notification_subscription/key", apiPrivateNotificationSubscriptionKey);
mountRoute("/api/private/notification_subscription/store", apiPrivateNotificationSubscriptionStore);

assertPrivateRoleGuards();

export default endpoint;
