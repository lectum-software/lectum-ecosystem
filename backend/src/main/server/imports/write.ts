import { Router } from "express";
import privateAuth from "@/modules/api/middlewares/_auth";
import { requireRole } from "@/modules/api/middlewares/require-role";
import apiPrivateAuthCode from "@/modules/api/private/auth/code";
import apiPrivateAuthConfirm from "@/modules/api/private/auth/confirm";
import apiPrivateAuthHidrate from "@/modules/api/private/auth/hidrate";
import apiPrivateAuthNeedReset from "@/modules/api/private/auth/need_reset";
import apiPrivateAuthReset from "@/modules/api/private/auth/reset";
import apiPrivateNotificationClean from "@/modules/api/private/notification/clean";
import apiPrivateNotificationIndex from "@/modules/api/private/notification/index";
import apiPrivateNotificationTest from "@/modules/api/private/notification/test";
import apiPrivateNotificationUpdate from "@/modules/api/private/notification/update";
import apiPrivateNotificationPreferenceShow from "@/modules/api/private/notification_preference/show";
import apiPrivateNotificationPreferenceUpdate from "@/modules/api/private/notification_preference/update";
import apiPrivateNotificationSubscriptionKey from "@/modules/api/private/notification_subscription/key";
import apiPrivateNotificationSubscriptionStore from "@/modules/api/private/notification_subscription/store";
import apiPrivatePatientOnboarding from "@/modules/api/private/patient/onboarding";
import apiPrivatePatientProfile from "@/modules/api/private/patient/profile";
import apiPrivatePsychologistBillingCurrent from "@/modules/api/private/psychologist/billing/current";
import apiPrivatePsychologistBillingPlans from "@/modules/api/private/psychologist/billing/plans";
import apiPublicAuthLogin from "@/modules/api/public/auth/login";
import apiPublicAuthRecovery from "@/modules/api/public/auth/recovery";
import apiPublicAuthReset from "@/modules/api/public/auth/reset";
import apiPublicGoogleCallback from "@/modules/api/public/google/callback";
import apiPublicGoogleLogin from "@/modules/api/public/google/login";
import apiPublicGoogleMe from "@/modules/api/public/google/me";
import apiPublicUser from "@/modules/api/public/user";

const endpoint = Router();

endpoint.use("/api/private/auth/code", apiPrivateAuthCode);
endpoint.use("/api/private/auth/confirm", apiPrivateAuthConfirm);
endpoint.use("/api/private/auth/hidrate", apiPrivateAuthHidrate);
endpoint.use("/api/private/auth/need_reset", apiPrivateAuthNeedReset);
endpoint.use("/api/private/auth/reset", apiPrivateAuthReset);
endpoint.use("/api/public/auth/login", apiPublicAuthLogin);
endpoint.use("/api/public/auth/recovery", apiPublicAuthRecovery);
endpoint.use("/api/public/auth/reset", apiPublicAuthReset);
endpoint.use("/api/public/google/callback", apiPublicGoogleCallback);
endpoint.use("/api/public/google/login", apiPublicGoogleLogin);
endpoint.use("/api/public/google/me", apiPublicGoogleMe);
endpoint.use("/api/public/user", apiPublicUser);
endpoint.use(
  "/api/private/patient/profile",
  privateAuth,
  requireRole("paciente"),
  apiPrivatePatientProfile,
);
endpoint.use(
  "/api/private/patient/onboarding",
  privateAuth,
  requireRole("paciente"),
  apiPrivatePatientOnboarding,
);
endpoint.use(
  "/api/private/psychologist/billing/plans",
  privateAuth,
  requireRole("psicologo"),
  apiPrivatePsychologistBillingPlans,
);
endpoint.use(
  "/api/private/psychologist/billing/current",
  privateAuth,
  requireRole("psicologo"),
  apiPrivatePsychologistBillingCurrent,
);
endpoint.use("/api/private/notification/clean", apiPrivateNotificationClean);
endpoint.use("/api/private/notification/index", apiPrivateNotificationIndex);
endpoint.use("/api/private/notification/update", apiPrivateNotificationUpdate);
endpoint.use("/api/private/notification_preference/show", apiPrivateNotificationPreferenceShow);
endpoint.use("/api/private/notification_preference/update", apiPrivateNotificationPreferenceUpdate);
endpoint.use("/api/private/notification_subscription/key", apiPrivateNotificationSubscriptionKey);
endpoint.use(
  "/api/private/notification_subscription/store",
  apiPrivateNotificationSubscriptionStore,
);

// Rota de desenvolvimento (sem auth): dispara notificação de teste para todos.
if (process.env.NODE_ENV !== "production") {
  endpoint.use("/api/private/notification/test", apiPrivateNotificationTest);
}

export default endpoint;
