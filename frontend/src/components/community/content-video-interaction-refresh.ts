import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import keys from "@/api/cache/keys";
import { getApiErrorHttpStatus } from "@/api/errors";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { getPostDetail, getPostReplyThread } from "@/api/req/posts";

type Target = Pick<PostContentVideo, "post_id" | "reply_id">;

export const subscribeContentVideoDiscussionChanges = (
  client: QueryClient,
  invalidate: (postId: string) => void,
) =>
  client.getMutationCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    const key = event.mutation.options.mutationKey;
    if (key?.[0] !== "posts" || (key[1] !== "create-reply" && key[1] !== "delete-reply")) return;
    const variables = event.mutation.state.variables as
      | { id?: string; postId?: string }
      | undefined;
    const postId = key[1] === "create-reply" ? variables?.id : variables?.postId;
    if (typeof postId === "string" && postId) invalidate(postId);
  });

export const useContentVideoDiscussionChanges = (invalidate: (postId: string) => void) => {
  const client = useQueryClient();
  const invalidateRef = useRef(invalidate);
  useLayoutEffect(() => {
    invalidateRef.current = invalidate;
  });
  useEffect(
    () => subscribeContentVideoDiscussionChanges(client, (id) => invalidateRef.current(id)),
    [client],
  );
};

export type ContentVideoInteractionSyncState = "idle" | "pending" | "error" | "unavailable";
export const contentVideoInteractionFailureState = (
  error: unknown,
): ContentVideoInteractionSyncState =>
  getApiErrorHttpStatus(error) === 404 ? "unavailable" : "error";
export const isContentVideoInteractionBlocking = (state: ContentVideoInteractionSyncState) =>
  state === "pending" || state === "error";

export const useContentVideoInteractionRevalidation = (
  active: boolean,
  revision: number,
  refresh: () => Promise<void>,
  cancel: () => void,
) => {
  const actions = useRef({ refresh, cancel });
  useLayoutEffect(() => {
    actions.current = { refresh, cancel };
  });
  useEffect(() => {
    if (!active || !revision) return;
    const current = actions.current;
    void current.refresh();
    return current.cancel;
  }, [active, revision]);
};

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
    descendants_count:
      replyId && "descendants_count" in entity
        ? (entity.descendants_count ?? entity.replies_count)
        : entity.replies_count,
  } satisfies Partial<PostContentVideo>;
};

export const useContentVideoInteractionSync = (
  client: QueryClient,
  target: Target,
  onInteraction: (patch: Partial<PostContentVideo>, revision?: number) => void,
  active: boolean,
  revision: number,
) => {
  const [interactionSync, setInteractionSync] = useState<ContentVideoInteractionSyncState>("idle");
  const syncController = useRef<AbortController | null>(null);
  const automaticController = useRef<AbortController | null>(null);
  const revisionRef = useRef(revision);
  useLayoutEffect(() => {
    revisionRef.current = revision;
  }, [revision]);
  useEffect(() => () => syncController.current?.abort(), []);
  const refreshAfterSubmit = async () => {
    syncController.current?.abort();
    const controller = new AbortController();
    syncController.current = controller;
    const token = revisionRef.current;
    setInteractionSync("pending");
    try {
      const patch = await refreshContentVideoInteraction(client, target, controller.signal);
      if (controller.signal.aborted) return;
      onInteraction(patch, token);
      setInteractionSync("idle");
    } catch (error) {
      if (syncController.current === controller)
        setInteractionSync(
          controller.signal.aborted ? "idle" : contentVideoInteractionFailureState(error),
        );
      throw error;
    }
  };
  const refreshInteractions = async () => {
    const pending = refreshAfterSubmit();
    automaticController.current = syncController.current;
    try {
      await pending;
    } catch {
      // The automatic path renders its error state; the composer needs the rejection to retry.
    }
  };
  useContentVideoInteractionRevalidation(active, revision, refreshInteractions, () =>
    automaticController.current?.abort(),
  );
  return { interactionSync, refreshAfterSubmit, refreshInteractions };
};
