import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";

export type ReplyProfileVisibility = {
  post_id: string;
  reply_id: string;
  hidden_from_profile: boolean;
};

export const setReplyProfileVisibility = async (input: {
  postId: string;
  replyId: string;
  hidden: boolean;
}) => {
  const response = await handleReq<ReplyProfileVisibility>({
    ...callEndpoint({
      route: "/api/private/posts/:id/replies/:replyId/profile-visibility",
      method: "PUT",
      params: { id: input.postId, replyId: input.replyId },
      body: { hidden: input.hidden },
    }),
    hideError: true,
  });
  if (
    response.post_id !== input.postId ||
    response.reply_id !== input.replyId ||
    response.hidden_from_profile !== input.hidden
  ) {
    throw new Error("Não foi possível confirmar a visibilidade da resposta.");
  }
  return response;
};
