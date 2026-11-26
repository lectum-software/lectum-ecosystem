import { callEndpoint } from "@/api/generator";
import type { user } from "@/api/generator/types";
import { handleReq } from "@/api/handle";
import {
  consumeGoogleRegistration,
  rememberGoogleRegistration,
} from "@/components/analytics/google-registration";
import { googleActionScope, trackGoogleEvent } from "@/components/analytics/google-runtime";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RecoveryPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  password: string;
  password_confirm: string;
};

export type RegisterPatientPayload = {
  marketing_guest_token?: string;
  measurement_allowed?: boolean;
  legal_document_ids: string[];
  privacy_acknowledged: boolean;
  birthdate: string;
  name: string;
  email: string;
  password: string;
  password_confirm: string;
  role: "paciente";
  adult_confirmed: boolean;
  terms_accepted: true;
  terms_version: string;
  analytics_visitor_id?: string;
  analytics_session_id?: string;
};

export type RegisterPsychologistPayload = {
  promotional_authorized: boolean;
  legal_document_ids: string[];
  privacy_acknowledged: boolean;
  birthdate: string;
  name: string;
  professional_first_name: string;
  professional_last_name: string;
  email: string;
  password: string;
  password_confirm: string;
  role: "psicologo";
  adult_confirmed: boolean;
  terms_accepted: true;
  terms_version: string;
  analytics_visitor_id?: string;
  analytics_session_id?: string;
};

export type VerifyCodePayload = {
  code: string;
};

export const prepareGoogleRegistration = async (deviceId: string, body: Record<string, string>) => {
  rememberGoogleRegistration();
  return handleReq<{ state: string }>({
    ...callEndpoint({
      route: "/api/public/google/login/:id/registration",
      params: { id: deviceId },
      body,
      config: { withCredentials: true },
    }),
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const login = async (body: LoginPayload) => {
  const handle = callEndpoint({
    route: "/api/public/auth/login",
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const hidrate = async (bearerToken?: string) => {
  const handle = callEndpoint({
    route: "/api/private/auth/hidrate",
    config: bearerToken
      ? {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      : undefined,
  });

  return handleReq<user>(handle);
};

export const recovery = async (body: RecoveryPayload) => {
  const handle = callEndpoint({
    route: "/api/public/auth/recovery",
    body,
  });

  return handleReq<boolean>({
    ...handle,
    hideError: true,
  });
};

export const resetPassword = async (code: string, body: ResetPasswordPayload) => {
  const handle = callEndpoint({
    route: "/api/public/auth/reset/:code",
    params: { code },
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const needResetPassword = async (body: ResetPasswordPayload) => {
  const handle = callEndpoint({
    route: "/api/private/auth/need_reset",
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};

export const registerPatient = async (body: RegisterPatientPayload) => {
  const googleScope = googleActionScope();
  const handle = callEndpoint({
    route: "/api/public/user/store",
    body,
  });

  const result = await handleReq<user>({
    ...handle,
    hideError: true,
  });
  if (result?.id) void trackGoogleEvent("sign_up", googleScope, result.id, "user");
  return result;
};

export const registerPsychologist = async (body: RegisterPsychologistPayload) => {
  const googleScope = googleActionScope();
  const handle = callEndpoint({
    route: "/api/public/user/store",
    body,
  });

  const result = await handleReq<user>({
    ...handle,
    hideError: true,
  });
  if (result?.id) void trackGoogleEvent("sign_up", googleScope, result.id, "professional");
  return result;
};

export const sendConfirmCode = async () => {
  const handle = callEndpoint({
    route: "/api/private/auth/confirm",
  });

  return handleReq<boolean>({
    ...handle,
    hideError: true,
  });
};

export const verifyCode = async ({ code }: VerifyCodePayload) => {
  const handle = callEndpoint({
    route: "/api/private/auth/code/:code",
    method: "PUT",
    params: { code },
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};

export const googleMe = async () => {
  const handle = callEndpoint({
    route: "/api/public/google/me",
  });

  const result = await handleReq<user & { registration_created?: boolean }>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
  const scope = consumeGoogleRegistration();
  if (result?.registration_created && result.id)
    void trackGoogleEvent(
      "sign_up",
      scope,
      result.id,
      result.role === "psicologo" ? "professional" : "user",
    );
  return result;
};
