import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
export const sendFeedback = (body: FormData) =>
  handleReq<{ id: string }>({
    ...callEndpoint({ route: "/api/private/feedback", method: "POST", body }),
    hideError: true,
  });
