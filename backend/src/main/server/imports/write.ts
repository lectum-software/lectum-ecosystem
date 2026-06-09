import { type RequestHandler, Router } from "express";
import privateAuth from "@/modules/api/middlewares/_auth";
import { requireRole } from "@/modules/api/middlewares/require-role";
import apiPrivateAuthCode from "@/modules/api/private/auth/code";
import apiPrivateAuthConfirm from "@/modules/api/private/auth/confirm";
import apiPrivateAuthHidrate from "@/modules/api/private/auth/hidrate";
import apiPrivateAuthNeedReset from "@/modules/api/private/auth/need_reset";
import apiPrivateAuthReset from "@/modules/api/private/auth/reset";
import apiPrivateDirectoryPsychologists from "@/modules/api/private/directory/psychologists";
import apiPrivateNotificationClean from "@/modules/api/private/notification/clean";
import apiPrivateNotificationIndex from "@/modules/api/private/notification/index";
import apiPrivateNotificationTest from "@/modules/api/private/notification/test";
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
import apiPrivatePsychologistBillingCurrent from "@/modules/api/private/psychologist/billing/current";
import apiPrivatePsychologistBillingPlans from "@/modules/api/private/psychologist/billing/plans";
import apiPrivatePsychologistBillingSelectFree from "@/modules/api/private/psychologist/billing/select-free";
import apiPrivatePsychologistCfp from "@/modules/api/private/psychologist/cfp";
import apiPrivatePsychologistFreeProfile from "@/modules/api/private/psychologist/free-profile";
import apiPrivatePsychologistReviews from "@/modules/api/private/psychologist/reviews";
import apiPrivatePsychologistWhatsappVerification from "@/modules/api/private/psychologist/whatsapp-verification";
import apiPublicAuthLogin from "@/modules/api/public/auth/login";
import apiPublicAuthRecovery from "@/modules/api/public/auth/recovery";
import apiPublicAuthReset from "@/modules/api/public/auth/reset";
import apiPublicGoogleCallback from "@/modules/api/public/google/callback";
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
mountRoute("/api/public/auth/login", apiPublicAuthLogin);
mountRoute("/api/public/auth/recovery", apiPublicAuthRecovery);
mountRoute("/api/public/auth/reset", apiPublicAuthReset);
mountRoute("/api/public/google/callback", apiPublicGoogleCallback);
mountRoute("/api/public/google/login", apiPublicGoogleLogin);
mountRoute("/api/public/google/me", apiPublicGoogleMe);
mountRoute("/api/public/user", apiPublicUser);
mountRoute("/api/private/user/favorites", privateAuth, apiPrivatePatientFavorites);
mountRoleGuardedRoute("/api/private/patient/favorites", "paciente", apiPrivatePatientFavorites);
mountRoleGuardedRoute("/api/private/patient/follows", "paciente", apiPrivatePatientFollows);
mountRoleGuardedRoute("/api/private/patient/profile", "paciente", apiPrivatePatientProfile);
mountRoleGuardedRoute("/api/private/patient/onboarding", "paciente", apiPrivatePatientOnboarding);
mountRoleGuardedRoute("/api/private/patient/reviews", "paciente", apiPrivatePatientReviews);
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

// Rota de desenvolvimento (sem auth): dispara notificaÃ§Ã£o de teste para todos.
if (process.env.NODE_ENV !== "production") {
  mountRoute("/api/private/notification/test", apiPrivateNotificationTest);
}

assertPrivateRoleGuards();

export default endpoint;
