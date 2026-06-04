import { callEndpoint } from "@/api/generator";
import type { user } from "@/api/generator/types";
import { handleReq } from "@/api/handle";

export type LoginPayload = {
  email: string;
  password: string;
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
