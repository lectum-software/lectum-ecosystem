import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";

export const key = async () => {
  const handle = callEndpoint({
    route: "/api/private/notification_subscription/key",
  });

  return handleReq<{ key: string }>(handle);
};

export const store = async (body: { subscription: unknown; force?: boolean }) => {
  const handle = callEndpoint({
    route: "/api/private/notification_subscription/store",
    body,
  });

  return handleReq<unknown>(handle);
};
