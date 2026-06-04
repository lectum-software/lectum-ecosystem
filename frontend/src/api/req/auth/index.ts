import { callEndpoint } from "@/api/generator";
import type { user } from "@/api/generator/types";
import { handleReq } from "@/api/handle";

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

export type VerifyCodePayload = {
  code: string;
};

export const login = async (body: LoginPayload) => {
  const handle = callEndpoint({
    route: "/api/public/auth/login",
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};

export const hidrate = async () => {
  const handle = callEndpoint({
    route: "/api/private/auth/hidrate",
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

  return handleReq<user>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};
