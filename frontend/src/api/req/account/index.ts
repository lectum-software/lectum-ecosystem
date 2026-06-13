import { callEndpoint } from "@/api/generator";
import type {
  AccountEmailPayload,
  AccountPasswordPayload,
  AccountSecurityResponse,
  GoogleLinkIntentResponse,
  user,
} from "@/api/generator/types";
import { handleReq } from "@/api/handle";

export type { AccountEmailPayload, AccountPasswordPayload };

export const security = async () => {
  const handle = callEndpoint({
    route: "/api/private/account/security",
  });

  return handleReq<AccountSecurityResponse>(handle);
};

export const updateEmail = async (body: AccountEmailPayload) => {
  const handle = callEndpoint({
    route: "/api/private/account/email",
    method: "PUT",
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};

export const updatePassword = async (body: AccountPasswordPayload) => {
  const handle = callEndpoint({
    route: "/api/private/account/password",
    method: "PUT",
    body,
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};

export const createGoogleLinkIntent = async () => {
  const handle = callEndpoint({
    route: "/api/public/google/link/intent",
    method: "POST",
  });

  return handleReq<GoogleLinkIntentResponse>({
    ...handle,
    hideError: true,
  });
};

export const unlinkGoogle = async () => {
  const handle = callEndpoint({
    route: "/api/public/google/link",
    method: "DELETE",
  });

  return handleReq<user>({
    ...handle,
    hideError: true,
  });
};
