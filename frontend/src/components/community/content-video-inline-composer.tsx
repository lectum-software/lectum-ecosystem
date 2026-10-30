"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PostContentVideo } from "@/api/generator/types/posts";
import { ReplyComposer } from "@/app/app/community/[slug]/post/[id]/components/reply-composer";
import { usePostDetailController } from "@/app/app/community/[slug]/post/[id]/views/post-detail-controller";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";

export type ContentVideoInlineComposerState = {
  busy: boolean;
  hasDraft: boolean;
  /** Includes media preparation as well as the complete publish/upload operation. */
  submitting: boolean;
};

export type ContentVideoInlineComposerProps = {
  item: PostContentVideo;
  active: boolean;
  /** Pause playback and lock swipe while focus, draft, picker or submission is active. */
  onBusyChange: (busy: boolean) => void;
  /** Confirm dismissal in the parent before deactivating/unmounting a dirty composer. */
  onDraftStateChange?: (hasDraft: boolean) => void;
  onStateChange?: (state: ContentVideoInlineComposerState) => void;
  onSubmitted: () => void | Promise<void>;
};

const ActiveContentVideoInlineComposer = ({
  item,
  onBusyChange,
  onDraftStateChange,
  onStateChange,
  onSubmitted,
}: Omit<ContentVideoInlineComposerProps, "active">) => {
  const controller = usePostDetailController({ postId: item.post_id, embedded: true });
  const conversion = useProgressiveConversion();
  const [composerState, setComposerState] = useState<ContentVideoInlineComposerState>({
    busy: false,
    hasDraft: false,
    submitting: false,
  });
  const { hasDraft } = composerState;
  const [submitting, setSubmitting] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(false);
  const callbacksRef = useRef({ onBusyChange, onDraftStateChange, onStateChange });
  const mutationPending =
    controller.createReplyMutation.isPending || controller.uploadReplyMediaMutation.isPending;
  const publishing = composerState.submitting || submitting || mutationPending;
  const busy = composerState.busy || hasDraft || publishing;
  const unavailable = !controller.post || Boolean(controller.postError);
  const replyTarget = item.reply_id
    ? { id: item.reply_id, name: getCommunityAuthorDisplayName(item.author) }
    : null;

  useEffect(() => {
    callbacksRef.current = { onBusyChange, onDraftStateChange, onStateChange };
  }, [onBusyChange, onDraftStateChange, onStateChange]);

  useEffect(() => {
    callbacksRef.current.onBusyChange(busy);
    callbacksRef.current.onDraftStateChange?.(hasDraft);
    callbacksRef.current.onStateChange?.({ busy, hasDraft, submitting: publishing });
  }, [busy, hasDraft, publishing]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      callbacksRef.current.onBusyChange(false);
      callbacksRef.current.onDraftStateChange?.(false);
      callbacksRef.current.onStateChange?.({ busy: false, hasDraft: false, submitting: false });
    };
  }, []);

  const refreshAfterSubmit = async () => {
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      await onSubmitted();
    } catch {
      if (mountedRef.current) setRefreshFailed(true);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  return (
    // Composer gestures must not also trigger the video's swipe or playback controls.
    // biome-ignore lint/a11y/noStaticElementInteractions: this boundary only isolates nested controls.
    <div
      className="relative max-h-[min(44dvh,320px)] min-w-0 overflow-y-auto overscroll-contain text-media-foreground"
      data-content-video-inline-composer="true"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== "Tab") event.stopPropagation();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      {controller.postQuery.isPending ? (
        <p className="flex items-center gap-2 py-2 text-xs text-media-foreground" role="status">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Carregando campo de comentário
        </p>
      ) : null}
      <ReplyComposer
        apiError={controller.postError || controller.replyError}
        appearance="reels"
        disabled={unavailable || submitting || mutationPending}
        formRef={controller.composerRef}
        mediaPermission={controller.mediaPermission}
        onStateChange={setComposerState}
        onSubmit={async (values, mediaFile, videoUploadOperation) => {
          if (unavailable || submittingRef.current || mutationPending) {
            throw new Error();
          }
          // Conversion is not a successful submission: keep the real composer's draft.
          if (!conversion.isAuthenticated) {
            conversion.requestConversion("trigger_comentar", {
              intent: {
                payload: { postId: item.post_id, replyId: item.reply_id },
                type: item.reply_id ? "reply_comment" : "comment_post",
              },
            });
            throw new Error();
          }
          submittingRef.current = true;
          setSubmitting(true);
          try {
            await controller.submitReply(values, item.reply_id, mediaFile, videoUploadOperation);
            // Refresh failure must never turn a persisted comment into a retryable publish.
            if (mountedRef.current) void refreshAfterSubmit();
          } finally {
            submittingRef.current = false;
            if (mountedRef.current) setSubmitting(false);
          }
        }}
        replyTarget={replyTarget}
        variant="embedded"
      />
      {controller.postError ? (
        <Button
          className="mt-2 min-h-11 text-media-foreground hover:bg-media-foreground/10 hover:text-media-foreground"
          disabled={controller.postQuery.isFetching}
          onClick={() => void controller.postQuery.refetch()}
          type="button"
          variant="ghost"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Tentar novamente
        </Button>
      ) : null}
      {refreshFailed ? (
        <div className="py-2 text-xs text-media-foreground" role="status">
          <p>Comentário enviado. Não foi possível atualizar a contagem.</p>
          <Button
            className="min-h-11 text-media-foreground hover:bg-media-foreground/10 hover:text-media-foreground"
            disabled={refreshing}
            onClick={() => void refreshAfterSubmit()}
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Atualizar contagem
          </Button>
        </div>
      ) : null}
    </div>
  );
};

/** Keep inactive slides free of the post controller's queries and listeners. */
export const ContentVideoInlineComposer = ({
  active,
  ...props
}: ContentVideoInlineComposerProps) =>
  active ? (
    <ActiveContentVideoInlineComposer
      key={`${props.item.post_id}:${props.item.reply_id ?? "post"}:${props.item.id}`}
      {...props}
    />
  ) : null;
