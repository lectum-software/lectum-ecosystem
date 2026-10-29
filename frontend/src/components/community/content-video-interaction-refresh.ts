import type { QueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { getPostDetail, getPostReplyThread } from "@/api/req/posts";

type Target = Pick<PostContentVideo, "post_id" | "reply_id">;

const waitForPendingInteractions = (client: QueryClient, postId: string, signal: AbortSignal) => {
  signal.throwIfAborted();
  const cache = client.getMutationCache();
  const pending = cache.getAll().filter((mutation) => {
    const context = mutation.state.context as { target?: { postId?: string } } | undefined;
    return (
      mutation.state.status === "pending" &&
      (!context?.target?.postId || context.target.postId === postId)
    );
  });
  if (!pending.length) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      unsubscribe();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    const check = () => {
      if (pending.some((mutation) => mutation.state.status === "pending")) return;
      cleanup();
      resolve();
    };
    const unsubscribe = cache.subscribe(check);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Pending comment interactions did not settle"));
    }, 15_000);
    signal.addEventListener("abort", abort, { once: true });
    check();
  });
};

export const refreshContentVideoInteraction = async (
  client: QueryClient,
  target: Target,
  signal: AbortSignal,
) => {
  // A sheet can close while its vote/save request is still committing.
  await waitForPendingInteractions(client, target.post_id, signal);
  signal.throwIfAborted();
  const replyId = target.reply_id;
  const queryKey = replyId
    ? ["posts", target.post_id, "reply-thread", replyId]
    : keys.posts.detail(target.post_id);
  await client.cancelQueries({ queryKey, exact: true });
  await client.invalidateQueries({ queryKey, exact: true, refetchType: "none" });
  signal.throwIfAborted();
  const entity = replyId
    ? (
        await client.fetchQuery({
          queryKey,
          queryFn: () => getPostReplyThread(target.post_id, replyId),
          staleTime: 0,
          retry: false,
        })
      ).reply
    : (
        await client.fetchQuery({
          queryKey,
          queryFn: () => getPostDetail(target.post_id),
          staleTime: 0,
          retry: false,
        })
      ).post;
  signal.throwIfAborted();
  if (entity.id !== (target.reply_id ?? target.post_id)) {
    throw new Error("Unexpected content video interaction target");
  }
  return {
    current_user_vote: entity.current_user_vote,
    upvotes_count: entity.upvotes_count,
    saved: entity.saved,
    replies_count: entity.replies_count,
  } satisfies Partial<PostContentVideo>;
};
