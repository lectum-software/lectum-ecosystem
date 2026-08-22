"use client";

import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCreatePostReply,
  useDeleteReply,
  usePostDetail,
  usePostReplyThread,
  useReportReply,
  useUploadPostReplyMedia,
  useVotePost,
} from "@/api/callers/posts";
import type { PostReply } from "@/api/generator/types/posts";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import type { CommunityVideoUploadOperation } from "@/hooks/use-community-video-upload";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import {
  createLectumShareLinkTarget,
  createLectumShareVideoTarget,
  findPostReplyInTree,
} from "@/utils/lectum-share-target";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import { ThreadOriginalPostCard } from "../components/post-content";
import { RepliesList } from "../components/replies-list";
import { PostReportModal, ReplyComposer } from "../components/reply-composer";
import { findReplyComposerInput } from "../components/reply-composer-dom";
import { submitReplyWithOptionalMedia } from "../modules/reply-submit";
import {
  confirmDiscardReplyDraft,
  EMPTY_REPLY_TARGETS,
  FOCUSED_REPLY_COMPOSER_VIEWPORT_FOLLOW_MS,
  findReplyInTree,
  type ReplyTarget,
  type ReplyTargetMap,
  type ReportTarget,
  resolvePostError,
  resolveReplyError,
  resolveReplyPublishError,
  useIsPostDetailMobile,
  useReplyFocusHighlight,
  useReplyMediaPermission,
} from "../modules/reply-support";
import { type ReplyComposerForm, toPostReportPayload } from "../use-form";

export const PostReplyThreadLogic = () => {
  const router = useRouter();
  const params = useParams<{ id: string; replyId: string; slug: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const replyId = typeof params.replyId === "string" ? params.replyId : "";
  const communitySlug = typeof params.slug === "string" ? params.slug : "";
  const isMobile = useIsPostDetailMobile();
  const currentUser = useAppSelector((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const conversion = useProgressiveConversion();
  const [activeFocusReplyId, setActiveFocusReplyId] = useState<string | null>(null);
  const [composerFocusReplyId, setComposerFocusReplyId] = useState<string | null>(null);
  const [composerFocusRequestKey, setComposerFocusRequestKey] = useState(0);
  const [replyComposerActive, setReplyComposerActive] = useState(false);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const composerRef = useRef<HTMLElement | null>(null);
  const inlineReplyFormRef = useRef<HTMLElement | null>(null);
  const inlineReplyHasDraftRef = useRef(false);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const threadQuery = usePostReplyThread(postId, replyId, Boolean(postId && replyId));
  const voteMutation = useVotePost(postId);
  const { shareLectumTarget } = useLectumDirectShare({
    onShared: (target) => {
      if (!target.replyId) return;

      setShareFeedback(target.replyId);
      window.setTimeout(() => setShareFeedback(null), 2400);
    },
  });
  const createReplyMutation = useCreatePostReply({
    onSuccess: () => setReplyError(null),
    onError: (error) => setReplyError(resolveReplyPublishError(error)),
  });
  const uploadReplyMediaMutation = useUploadPostReplyMedia();
  const reportReplyMutation = useReportReply({
    onSuccess: () => {
      setReportError(null);
      setReportTarget(null);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
  });
  const deleteReplyMutation = useDeleteReply({
    onSuccess: () => setDeleteReplyError(null),
    onError: (error) => setDeleteReplyError(resolveReplyError(error)),
  });
  const post = postQuery.data?.post;
  const rootReply = threadQuery.data?.reply;
  const threadBackFallbackHref = post
    ? `/comunidades/${post.community.slug}`
    : communitySlug
      ? `/comunidades/${communitySlug}`
      : DEFAULT_COMMUNITY_FEED_HREF;
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const threadError = threadQuery.isError ? resolvePostError(threadQuery.error) : null;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;
  const resetReplyFocusHighlight = useReplyFocusHighlight(
    activeFocusReplyId,
    threadQuery.isFetching,
  );
  const resetReplyComposerFocusHighlight = useReplyFocusHighlight(composerFocusReplyId, false, {
    focusKey: composerFocusRequestKey,
    scrollMode: "composer-start",
    viewportFollowMs: FOCUSED_REPLY_COMPOSER_VIEWPORT_FOLLOW_MS,
  });

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const parentReply = rootReply ? findPostReplyInTree([rootReply], reply.parent_reply_id) : null;
    const videoTarget = createLectumShareVideoTarget(post, reply, {
      parentContent: parentReply?.content ?? null,
    });

    if (videoTarget) {
      await shareLectumTarget(videoTarget);
      return;
    }

    const threadRootId = rootReply?.id ?? reply.id;
    await shareLectumTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl: `/comunidades/${post.community.slug}/publicacao/${post.id}/resposta/${threadRootId}#reply-${reply.id}`,
        replyId: reply.id,
        text: reply.content,
        title: "Resposta na Lectum",
      }),
    );
  };

  const setInlineReplyDraftState = useCallback((hasDraft: boolean) => {
    inlineReplyHasDraftRef.current = hasDraft;
  }, []);

  const closeDesktopReplyTarget = useCallback(() => {
    inlineReplyHasDraftRef.current = false;
    setReplyError(null);
    setDesktopReplyTargets({});
  }, []);

  const requestCloseDesktopReplyTarget = useCallback(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return true;
    if (inlineReplyHasDraftRef.current && !confirmDiscardReplyDraft()) return false;

    closeDesktopReplyTarget();
    return true;
  }, [closeDesktopReplyTarget, desktopReplyTargets, isMobile]);

  const requestReplyComposerFocus = useCallback(
    (targetReplyId: string) => {
      resetReplyComposerFocusHighlight();
      setComposerFocusReplyId(targetReplyId);
      setComposerFocusRequestKey((currentKey) => currentKey + 1);
    },
    [resetReplyComposerFocusHighlight],
  );

  const focusComposerInput = useCallback(() => {
    const inputNode = findReplyComposerInput(composerRef.current);

    inputNode?.focus({ preventScroll: true });

    return Boolean(inputNode);
  }, []);

  const handleReplyTarget = useCallback(
    (reply: PostReply) => {
      setReplyError(null);
      if (!conversion.isAuthenticated) {
        conversion.requestConversion("trigger_comentar", {
          intent: {
            payload: {
              postId,
              replyId: reply.id,
            },
            type: "reply_comment",
          },
        });
        return;
      }

      const target = { id: reply.id, name: getCommunityAuthorDisplayName(reply.author) };

      if (isMobile) {
        requestReplyComposerFocus(reply.id);
        setMobileReplyTarget(target);
        focusComposerInput();
        window.setTimeout(() => {
          focusComposerInput();
        }, 0);
        return;
      }

      if (desktopReplyTargets[reply.id]) {
        requestReplyComposerFocus(reply.id);
        window.setTimeout(() => {
          findReplyComposerInput(inlineReplyFormRef.current)?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      if (!requestCloseDesktopReplyTarget()) return;

      requestReplyComposerFocus(reply.id);
      inlineReplyHasDraftRef.current = false;
      setDesktopReplyTargets({ [reply.id]: target });
    },
    [
      conversion,
      desktopReplyTargets,
      focusComposerInput,
      isMobile,
      postId,
      requestCloseDesktopReplyTarget,
      requestReplyComposerFocus,
    ],
  );

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
    videoUploadOperation?: CommunityVideoUploadOperation,
  ) => {
    if (!post || !rootReply) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId: post.id,
            replyId: parentReplyId ?? rootReply.id,
          },
          type: "reply_comment",
        },
      });
      return;
    }

    const createdReply = await submitReplyWithOptionalMedia({
      createReply: createReplyMutation.mutateAsync,
      mediaFile,
      parentReplyId: parentReplyId ?? rootReply.id,
      postId: post.id,
      setReplyError,
      uploadReplyMedia: uploadReplyMediaMutation.mutateAsync,
      values,
      videoUploadOperation,
    });

    resetReplyFocusHighlight();
    setActiveFocusReplyId(createdReply.id);

    if (parentReplyId) {
      closeDesktopReplyTarget();
    }

    setMobileReplyTarget(null);
  };

  useEffect(() => {
    if (isMobile || Object.keys(desktopReplyTargets).length === 0) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inlineReplyFormRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-reply-open-trigger="true"]')) {
        return;
      }

      requestCloseDesktopReplyTarget();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [desktopReplyTargets, isMobile, requestCloseDesktopReplyTarget]);

  const handleVoteThreadReply = (targetReplyId: string, value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            replyId: targetReplyId,
            value,
          },
          type: "vote_reply",
        },
      });
      return;
    }

    voteMutation.mutate({ replyId: targetReplyId, value });
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !post || !rootReply) return;

    const intent = conversion.consumePendingIntent((candidate) => {
      if (candidate.type !== "reply_comment") return false;
      if (String(candidate.payload?.postId ?? "") !== post.id) return false;

      const targetReplyId = String(candidate.payload?.replyId ?? "");

      return Boolean(targetReplyId && findReplyInTree([rootReply], targetReplyId));
    });

    if (!intent) return;

    const targetReplyId = String(intent.payload?.replyId ?? "");
    const reply = findReplyInTree([rootReply], targetReplyId);

    if (reply) {
      window.setTimeout(() => handleReplyTarget(reply), 0);
    }
  }, [conversion, handleReplyTarget, post, rootReply]);

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background pb-6 text-foreground dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        <div className="px-5 pt-4 pb-2 sm:px-0 sm:pt-5 sm:pb-3">
          <div className="grid min-h-[58px] grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
            <Button
              aria-label="Voltar"
              className="h-10 w-10 rounded-full border border-border bg-surface/70 p-0 text-muted shadow-lectum-soft transition hover:border-primary/30 hover:bg-surface hover:text-foreground dark:border-border dark:bg-surface-muted/60 dark:text-muted dark:hover:text-foreground"
              onClick={() => navigateBackWithFallback(router, threadBackFallbackHref)}
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Voltar</span>
            </Button>

            <div className="grid min-w-0 justify-items-center gap-1.5 py-1 text-center">
              <p className="text-[15px] font-black leading-[1.2] tracking-[-0.02em] text-foreground dark:text-foreground">
                Respostas
              </p>
              <p className="max-w-full text-[11px] font-semibold leading-[1.45] text-muted dark:text-muted">
                Continuação da conversa
              </p>
            </div>

            <span className="h-10 w-10" aria-hidden="true" />
          </div>
        </div>

        {postQuery.isLoading || threadQuery.isLoading ? (
          <div className="grid min-h-[70vh] place-items-center px-5">
            <LoadingState label="Carregando respostas" />
          </div>
        ) : null}

        {postError || threadError ? (
          <div className="px-5 pt-6">
            <EmptyState
              action={
                <Button asChild variant="outline">
                  <Link
                    href={
                      post
                        ? `/comunidades/${post.community.slug}/publicacao/${post.id}`
                        : DEFAULT_COMMUNITY_FEED_HREF
                    }
                  >
                    Voltar ao post
                  </Link>
                </Button>
              }
              description={postError || threadError || "Não foi possível carregar esta árvore."}
              icon={MessageCircle}
              title="Árvore indisponível"
            />
          </div>
        ) : null}

        {post && rootReply ? (
          <div className="grid gap-4 px-5 pt-4 pb-36 sm:px-0 sm:pb-6">
            <ThreadOriginalPostCard post={post} />

            {shareFeedback ? (
              <InlineAlert title="Link preparado" variant="success">
                Link copiado ou enviado para compartilhamento.
              </InlineAlert>
            ) : null}

            {deleteReplyError ? (
              <InlineAlert title="Comentário não excluído" variant="error">
                {deleteReplyError}
              </InlineAlert>
            ) : null}

            <RepliesList
              activeInlineReplyFormRef={inlineReplyFormRef}
              currentUserId={currentUserId}
              deleteReplyPending={deleteReplyMutation.isPending}
              errorMessage={null}
              focusReplyId={activeFocusReplyId}
              inlineReplyTargets={visibleInlineReplyTargets}
              loading={false}
              mediaPermission={mediaPermission}
              onCancelInlineReplyTarget={closeDesktopReplyTarget}
              onInlineReplyDraftChange={setInlineReplyDraftState}
              onDeleteReply={(reply) =>
                deleteReplyMutation.mutate({ postId: post.id, replyId: reply.id })
              }
              onReply={handleReplyTarget}
              onReportReply={(reply) => {
                setReportError(null);
                setReportTarget({ reply, type: "reply" });
              }}
              onShare={shareReply}
              onSubmitReply={(values, parentReplyId, mediaFile, videoUploadOperation) =>
                submitReply(values, parentReplyId, mediaFile, videoUploadOperation)
              }
              onVote={handleVoteThreadReply}
              postId={post.id}
              postSourceText={post.title}
              replies={[rootReply]}
              replyApiError={replyError}
              replyComposerTargetId={
                replyComposerActive ? (activeMobileReplyTarget?.id ?? null) : null
              }
              replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              showSectionTitle={false}
              threadHrefBase={`/comunidades/${post.community.slug}/publicacao/${post.id}/resposta`}
              votePending={voteMutation.isPending}
            />

            <ReplyComposer
              apiError={isMobile ? replyError : null}
              autoFocus={Boolean(activeMobileReplyTarget)}
              disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
              formRef={composerRef}
              mediaPermission={mediaPermission}
              onCancelContext={() => {
                setReplyError(null);
                setReplyComposerActive(false);
                setMobileReplyTarget(null);
              }}
              onComposerActiveChange={setReplyComposerActive}
              onSubmit={(values, mediaFile, videoUploadOperation) =>
                submitReply(
                  values,
                  activeMobileReplyTarget?.id ?? rootReply.id,
                  mediaFile,
                  videoUploadOperation,
                )
              }
              replyToName={getCommunityAuthorDisplayName(rootReply.author)}
              replyTarget={activeMobileReplyTarget}
            />

            <PostReportModal
              apiError={reportError}
              disabled={reportReplyMutation.isPending}
              onClose={() => setReportTarget(null)}
              onSubmit={async (values) => {
                if (!post || reportTarget?.type !== "reply") return;

                setReportError(null);
                await reportReplyMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                  replyId: reportTarget.reply.id,
                });
              }}
              open={reportTarget?.type === "reply"}
              subject={reportTarget?.type === "reply" ? reportTarget.reply.content : ""}
              title="Denunciar comentário"
            />
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
