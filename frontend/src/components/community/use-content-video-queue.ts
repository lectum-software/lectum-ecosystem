"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getApiErrorHttpStatus } from "@/api/errors";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { getPostContentVideos } from "@/api/req/posts";
import { createContentVideoCommunityContinuation } from "./content-video-community-continuation";
import type { ContentVideoSource, ContentVideoSourceEntry } from "./content-video-context";
import {
  appendContentVideoPage,
  type ContentVideoInteractionState,
  contentVideoKey,
  invalidateContentVideoDiscussion,
  updateContentVideoInteractionState,
} from "./content-video-queue-interactions";

export { contentVideoKey } from "./content-video-queue-interactions";

const sourceKey = (source: ContentVideoSource | null) =>
  JSON.stringify([source?.mode, source?.hasNextPage, source?.entries]);

const waitForSourceTick = (signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, 100);
    signal.addEventListener("abort", finish, { once: true });
  });

export const useContentVideoQueue = (
  initial: ContentVideoSourceEntry,
  source: ContentVideoSource | null,
) => {
  const sourceRef = useRef(source);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  const [interactionState, setInteractionState] = useState<ContentVideoInteractionState>({
    items: [],
    revision: 0,
    staleInteractions: {},
  });
  const { items, staleInteractions } = interactionState;
  const interactionStateRef = useRef(interactionState);
  useLayoutEffect(() => {
    interactionStateRef.current = interactionState;
  }, [interactionState]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expired, setExpired] = useState(false);
  const initialRef = useRef(initial);
  const [ended, setEnded] = useState(false);
  const [revision, setRevision] = useState(0);
  const cursor = useRef({
    entry: initial,
    page: 1,
    nextCursor: undefined as string | undefined,
    done: false,
    seen: new Set<string>(),
    visited: new Set<string>(),
  });
  const busy = useRef(false);
  const continuation = useRef<ReturnType<typeof createContentVideoCommunityContinuation> | null>(
    null,
  );
  const lifecycle = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);

  const loadNext = useCallback(async () => {
    const signal = lifecycle.current?.signal;
    if (busy.current || !signal || signal.aborted) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    const state = cursor.current;
    let progressed = false;
    let requestedVideo = false;
    const finish = () => {
      setEnded(true);
      setIndex((value) => Math.min(value, Math.max(0, state.seen.size - 1)));
    };
    try {
      const scope = sourceRef.current;
      if (state.done) {
        if (!scope || scope.mode === "discussion") {
          finish();
          return;
        }
        const position = scope.entries.findIndex(
          (entry) =>
            entry.postId === state.entry.postId &&
            (scope.mode !== "profile" || (entry.replyId ?? null) === (state.entry.replyId ?? null)),
        );
        let next = continuation.current
          ? undefined
          : scope.entries
              .slice(Math.max(0, position + 1))
              .find(
                (entry) =>
                  !state.visited.has(
                    `${entry.postId}:${scope.mode === "profile" ? (entry.replyId ?? "post") : "discussion"}`,
                  ),
              );
        if (!next) {
          if (!continuation.current && scope.hasNextPage && scope.onLoadMore) {
            const before = sourceKey(scope);
            const deadline = Date.now() + 15_000;
            let callback = scope.onLoadMore;
            let pending = callback();
            let returnsPromise = Boolean(
              pending && typeof (pending as PromiseLike<unknown>).then === "function",
            );
            while (!signal.aborted) {
              const result = await pending;
              if (signal.aborted) return;
              // TanStack fetchNextPage resolves an error result unless throwOnError is enabled.
              if (result && typeof result === "object" && "isError" in result && result.isError)
                throw new Error("Source pagination failed");
              if (sourceKey(sourceRef.current) !== before) {
                progressed = true;
                return;
              }
              if (Date.now() >= deadline) throw new Error("Source pagination did not advance");
              await waitForSourceTick(signal);
              if (signal.aborted) return;
              if (sourceKey(sourceRef.current) !== before) {
                progressed = true;
                return;
              }
              // Profile callbacks can return void while a background refetch blocks loading.
              // Their identity changes when that guard clears; retry only then, not on a timer.
              const updatedCallback = sourceRef.current?.onLoadMore;
              if (!returnsPromise && updatedCallback && updatedCallback !== callback) {
                callback = updatedCallback;
                pending = callback();
                returnsPromise = Boolean(
                  pending && typeof (pending as PromiseLike<unknown>).then === "function",
                );
              } else pending = undefined;
            }
            return;
          }
          if (scope.mode !== "feed") {
            finish();
            return;
          }
          continuation.current ??= createContentVideoCommunityContinuation(
            interactionStateRef.current.items.at(-1)?.community.slug,
          );
          const discovered = await continuation.current.next(signal, state.visited);
          if (signal.aborted) return;
          if (!discovered.entry) {
            if (discovered.ended) finish();
            else progressed = true;
            return;
          }
          next = discovered.entry;
        }
        state.entry = next;
        state.page = 1;
        state.nextCursor = undefined;
        state.done = false;
      }
      const requestedRevision = interactionStateRef.current.revision;
      requestedVideo = true;
      const result = await getPostContentVideos(state.entry.postId, {
        limit: 20,
        ...(state.nextCursor
          ? { cursor: state.nextCursor }
          : state.entry.replyId
            ? { focusReplyId: state.entry.replyId }
            : {}),
      });
      if (signal.aborted) return;
      // Missing cursor is a contract error, not permission to restart offset pagination.
      if (
        result.next_cursor !== null &&
        (typeof result.next_cursor !== "string" ||
          !result.next_cursor ||
          result.next_cursor === state.nextCursor)
      )
        throw new Error("Invalid video continuation");
      const candidates =
        scope?.mode === "profile"
          ? result.data.filter((item) => (item.reply_id ?? null) === (state.entry.replyId ?? null))
          : result.data;
      // Post media fit in page one; prioritize the clicked media only for the initial entry.
      const focusedMediaIndex =
        state.page === 1 && state.visited.size === 0 && state.entry.mediaUrl
          ? candidates.findIndex((item) => item.media_url === state.entry.mediaUrl)
          : -1;
      const orderedCandidates =
        focusedMediaIndex > 0
          ? [
              candidates[focusedMediaIndex],
              ...candidates.slice(0, focusedMediaIndex),
              ...candidates.slice(focusedMediaIndex + 1),
            ]
          : candidates;
      const added = orderedCandidates.filter((item) => {
        const key = contentVideoKey(item);
        if (state.seen.has(key)) return false;
        state.seen.add(key);
        return true;
      });
      state.page += 1;
      state.nextCursor = result.next_cursor ?? undefined;
      state.done = result.next_cursor === null;
      if (state.done)
        state.visited.add(
          `${state.entry.postId}:${scope?.mode === "profile" ? (state.entry.replyId ?? "post") : "discussion"}`,
        );
      setInteractionState((previous) => appendContentVideoPage(previous, added, requestedRevision));
      progressed = true;
    } catch (cause) {
      if (!signal.aborted) {
        if (
          requestedVideo &&
          continuation.current &&
          [403, 404].includes(getApiErrorHttpStatus(cause) ?? 0)
        ) {
          state.visited.add(`${state.entry.postId}:discussion`);
          state.done = true;
          progressed = true;
          return;
        }
        setError(true);
        if (getApiErrorHttpStatus(cause) === 410) setExpired(true);
      }
    } finally {
      busy.current = false;
      if (!signal.aborted) {
        setLoading(false);
        // Wake the consumer after releasing the lock, even if source updates arrived mid-request.
        if (progressed) setRevision((value) => value + 1);
      }
    }
  }, []);

  useEffect(() => {
    void revision;
    void source?.entries.length;
    void source?.hasNextPage;
    if (error || ended || items.length > index + 1) return;
    const timer = window.setTimeout(() => {
      void loadNext();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    ended,
    error,
    index,
    items.length,
    loadNext,
    revision,
    source?.entries.length,
    source?.hasNextPage,
  ]);

  return {
    items,
    staleInteractions,
    invalidateDiscussion: (postId: string) =>
      setInteractionState((previous) => invalidateContentVideoDiscussion(previous, postId)),
    index,
    loading,
    error,
    expired,
    ended,
    select: (target: number) => {
      if (!Number.isFinite(target)) return;
      setIndex(
        Math.max(0, Math.min(Math.trunc(target), Math.max(0, items.length - (ended ? 1 : 0)))),
      );
    },
    next: () =>
      setIndex((value) => Math.min(value + 1, Math.max(0, items.length - (ended ? 1 : 0)))),
    previous: () => setIndex((value) => Math.max(0, value - 1)),
    retry: () => {
      if (!expired) return loadNext();
      // Only an explicit user action may replace an expired snapshot, never append to it.
      cursor.current = {
        entry: initialRef.current,
        page: 1,
        nextCursor: undefined,
        done: false,
        seen: new Set<string>(),
        visited: new Set<string>(),
      };
      continuation.current = null;
      setInteractionState((previous) => ({
        items: [],
        revision: previous.revision + 1,
        staleInteractions: {},
      }));
      setIndex(0);
      setEnded(false);
      setExpired(false);
      setError(false);
      setRevision((value) => value + 1);
    },
    updateItem: (key: string, patch: Partial<PostContentVideo>, revalidatedRevision?: number) =>
      setInteractionState((previous) =>
        updateContentVideoInteractionState(previous, key, patch, revalidatedRevision),
      ),
  };
};
