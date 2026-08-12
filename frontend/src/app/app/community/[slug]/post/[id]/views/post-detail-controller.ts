"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/api/callers/account";
import {
  useCreatePostReply,
  useDeleteReply,
  usePostDetail,
  usePostReplies,
  usePostRepliesPages,
  useReportPost,
  useReportReply,
  useSavePost,
  useUploadPostReplyMedia,
  useVotePost,
} from "@/api/callers/posts";
import type { PostReply } from "@/api/generator/types/posts";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareTracking } from "@/hooks/use-lectum-share-tracking";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumShareVideoTarget,
  findPostReplyInTree,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { submitReplyWithOptionalMedia } from "../modules/reply-submit";
import {
  confirmDiscardReplyDraft,
  createReplyPageRange,
  EMPTY_REPLY_TARGETS,
  findReplyInTree,
  mergeUniqueReplies,
  POST_REPLY_COMPOSER_INPUT_SELECTOR,
  PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR,
  REPLIES_LIMIT,
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
import type { ReplyComposerForm } from "../use-form";

export const usePostDetailController = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const postId = typeof params.id === "string" ? params.id : "";
  const focusReplyIdFromUrl = searchParams.get("focusReplyId")?.trim() || null;
  const isMobile = useIsPostDetailMobile();
  const currentUser = useAppSelector((state) => state.user);
  const currentUserId = currentUser?.id ?? null;
  const isPsychologistUser = currentUser?.role === "psicologo";
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: isPsychologistUser,
  });
  const conversion = useProgressiveConversion();
  const [loadedReplyPages, setLoadedReplyPages] = useState(() => createReplyPageRange(1));
  const [activeFocusReplyId, setActiveFocusReplyId] = useState<string | null>(focusReplyIdFromUrl);
  const [focusLookupReplyId, setFocusLookupReplyId] = useState<string | null>(focusReplyIdFromUrl);
  const [mobileReplyTarget, setMobileReplyTarget] = useState<ReplyTarget>(null);
  const [desktopReplyTargets, setDesktopReplyTargets] = useState<ReplyTargetMap>({});
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteReplyError, setDeleteReplyError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyFormRef = useRef<HTMLFormElement | null>(null);
  const inlineReplyHasDraftRef = useRef(false);
  const hasShownPsychologistReplyTipThisVisitRef = useRef(false);
  const hasPersistedPsychologistReplyTipSeenRef = useRef(false);
  const loadMoreRepliesRef = useRef<HTMLDivElement | null>(null);
  const [showPsychologistReplyTip, setShowPsychologistReplyTip] = useState(false);
  const mediaPermission = useReplyMediaPermission();
  const postQuery = usePostDetail(postId);
  const replyPageQueries = usePostRepliesPages(
    postId,
    loadedReplyPages.map((page) => ({ page, limit: REPLIES_LIMIT })),
    Boolean(postQuery.data),
  );
  const focusReplyLookupQuery = usePostReplies(
    postId,
    { focusReplyId: focusLookupReplyId ?? undefined, page: 1, limit: REPLIES_LIMIT },
    Boolean(postQuery.data && focusLookupReplyId),
  );
  const voteMutation = useVotePost(postId);
  const saveMutation = useSavePost(postId);
  const trackLectumShare = useLectumShareTracking(shareVideoTarget);
  const createReplyMutation = useCreatePostReply({
    onSuccess: () => setReplyError(null),
    onError: (error) => setReplyError(resolveReplyPublishError(error)),
  });
  const uploadReplyMediaMutation = useUploadPostReplyMedia();
  const reportMutation = useReportPost({
    onSuccess: () => {
      setReportError(null);
      setReportTarget(null);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
  });
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
  const replies = useMemo(
    () => mergeUniqueReplies(replyPageQueries.map((query) => query.data?.data)),
    [replyPageQueries],
  );
  const totalReplyPages = Math.max(
    0,
    focusReplyLookupQuery.data?.pages ?? 0,
    ...replyPageQueries.map((query) => query.data?.pages ?? 0),
  );
  const highestLoadedReplyPage = loadedReplyPages[loadedReplyPages.length - 1] ?? 1;
  const isRepliesFetching =
    focusReplyLookupQuery.isFetching || replyPageQueries.some((query) => query.isFetching);
  const isInitialRepliesLoading =
    replies.length === 0 && replyPageQueries.some((query) => query.isLoading || query.isPending);
  const hasMoreReplies = totalReplyPages > 0 && highestLoadedReplyPage < totalReplyPages;
  const canLoadMoreReplies = hasMoreReplies && !isRepliesFetching;
  const isLoadingMoreReplies = replies.length > 0 && isRepliesFetching;
  const repliesQueryError = replyPageQueries.find((query) => query.isError)?.error;
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const repliesError = repliesQueryError ? resolvePostError(repliesQueryError) : null;
  const hasDesktopReplyTargets = !isMobile && Object.keys(desktopReplyTargets).length > 0;
  const activeMobileReplyTarget = isMobile ? mobileReplyTarget : null;
  const visibleInlineReplyTargets = isMobile ? EMPTY_REPLY_TARGETS : desktopReplyTargets;
  const isPatientAuthoredPost = post?.author.role === "paciente";
  const canShowPsychologistReplyTip =
    isPsychologistUser &&
    Boolean(isPatientAuthoredPost) &&
    accountTips.onboardingTips.isSuccess &&
    !accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip;
  const shouldExposePsychologistReplyTipTarget =
    canShowPsychologistReplyTip || showPsychologistReplyTip;
  const resetReplyFocusHighlight = useReplyFocusHighlight(
    activeFocusReplyId,
    isRepliesFetching || Boolean(focusLookupReplyId),
  );

  useEffect(() => {
    if (!postId) return;

    const syncTimer = window.setTimeout(() => {
      resetReplyFocusHighlight();
      setLoadedReplyPages(createReplyPageRange(1));
      setFocusLookupReplyId(focusReplyIdFromUrl);
      setActiveFocusReplyId(focusReplyIdFromUrl);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [focusReplyIdFromUrl, postId, resetReplyFocusHighlight]);

  useEffect(() => {
    if (!focusLookupReplyId || !focusReplyLookupQuery.data?.page) return;

    const focusPage = focusReplyLookupQuery.data.page;
    const syncTimer = window.setTimeout(() => {
      setLoadedReplyPages((currentPages) => {
        if (focusPage <= (currentPages[currentPages.length - 1] ?? 1)) {
          return currentPages;
        }

        return createReplyPageRange(focusPage);
      });
      setFocusLookupReplyId(null);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [focusLookupReplyId, focusReplyLookupQuery.data?.page]);

  const requestNextRepliesPage = useCallback(() => {
    setLoadedReplyPages((currentPages) => {
      const currentLastPage = currentPages[currentPages.length - 1] ?? 1;
      if (totalReplyPages > 0 && currentLastPage >= totalReplyPages) return currentPages;

      const nextPage = currentLastPage + 1;
      if (currentPages.includes(nextPage)) return currentPages;

      return [...currentPages, nextPage];
    });
  }, [totalReplyPages]);

  useEffect(() => {
    const target = loadMoreRepliesRef.current;
    if (!target || !canLoadMoreReplies) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        requestNextRepliesPage();
      },
      {
        rootMargin: "360px 0px 520px",
        threshold: 0.01,
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [canLoadMoreReplies, requestNextRepliesPage]);

  const persistPsychologistReplyTipSeen = useCallback(() => {
    if (
      !accountTips.userId ||
      hasPersistedPsychologistReplyTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedPsychologistReplyTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologist_reply_tip: true,
      },
      {
        onError: () => {
          hasPersistedPsychologistReplyTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologist_reply_tip,
    accountTips.updateOnboardingTips,
    accountTips.userId,
  ]);

  useEffect(() => {
    hasShownPsychologistReplyTipThisVisitRef.current = false;
    hasPersistedPsychologistReplyTipSeenRef.current = false;

    const frame = window.requestAnimationFrame(() => setShowPsychologistReplyTip(false));

    if (!accountTips.userId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTips.userId]);

  const sharePost = async () => {
    if (!post || typeof window === "undefined") return;

    setShareVideoTarget(
      createLectumSharePostMediaTarget(post) ?? createLectumShareLinkTarget(post),
    );
  };

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const parentReply = findPostReplyInTree(replies, reply.parent_reply_id);
    const videoTarget = createLectumShareVideoTarget(post, reply, {
      parentContent: parentReply?.content ?? null,
    });

    if (videoTarget) {
      setShareVideoTarget(videoTarget);
      return;
    }

    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl: `/comunidades/${post.community.slug}/publicacao/${post.id}#reply-${reply.id}`,
        replyId: reply.id,
        text: reply.content,
        title: "Resposta na Lectum",
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    trackLectumShare(channel);
    setShareFeedback(shareVideoTarget.replyId ?? "post");
    window.setTimeout(() => setShareFeedback(null), 2400);
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

  const focusComposerTextarea = useCallback(
    ({ scrollDesktop = false }: { scrollDesktop?: boolean } = {}) => {
      const composerNode = composerRef.current;
      const inputNode = composerNode?.querySelector<HTMLElement>(
        POST_REPLY_COMPOSER_INPUT_SELECTOR,
      );

      if (!isMobile && scrollDesktop) {
        composerNode?.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      inputNode?.focus({ preventScroll: true });

      return Boolean(inputNode);
    },
    [isMobile],
  );

  const focusMainComposer = useCallback(() => {
    setReplyError(null);
    if (isPsychologistUser && isPatientAuthoredPost) {
      hasShownPsychologistReplyTipThisVisitRef.current = true;
      persistPsychologistReplyTipSeen();
      setShowPsychologistReplyTip(false);
    }
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId,
          },
          type: "comment_post",
        },
      });
      return;
    }

    setMobileReplyTarget(null);
    focusComposerTextarea({ scrollDesktop: true });

    window.setTimeout(() => {
      focusComposerTextarea({ scrollDesktop: true });
    }, 0);
  }, [
    conversion,
    focusComposerTextarea,
    isPatientAuthoredPost,
    isPsychologistUser,
    persistPsychologistReplyTipSeen,
    postId,
  ]);

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
        setMobileReplyTarget(target);
        focusComposerTextarea();

        window.setTimeout(() => {
          focusComposerTextarea();
        }, 0);

        return;
      }

      if (desktopReplyTargets[reply.id]) {
        window.setTimeout(() => {
          const inputNode = inlineReplyFormRef.current?.querySelector<HTMLElement>(
            POST_REPLY_COMPOSER_INPUT_SELECTOR,
          );
          inputNode?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      if (!requestCloseDesktopReplyTarget()) return;

      inlineReplyHasDraftRef.current = false;
      setDesktopReplyTargets({ [reply.id]: target });
    },
    [
      conversion,
      desktopReplyTargets,
      focusComposerTextarea,
      isMobile,
      postId,
      requestCloseDesktopReplyTarget,
    ],
  );

  const submitReply = async (
    values: ReplyComposerForm,
    parentReplyId?: string | null,
    mediaFile?: File | null,
  ) => {
    if (!post) return;
    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comentar", {
        intent: {
          payload: {
            postId: post.id,
            replyId: parentReplyId ?? null,
          },
          type: parentReplyId ? "reply_comment" : "comment_post",
        },
      });
      return;
    }

    const createdReply = await submitReplyWithOptionalMedia({
      createReply: createReplyMutation.mutateAsync,
      mediaFile,
      parentReplyId,
      postId: post.id,
      setReplyError,
      uploadReplyMedia: uploadReplyMediaMutation.mutateAsync,
      values,
    });

    resetReplyFocusHighlight();
    setActiveFocusReplyId(createdReply.id);
    setFocusLookupReplyId(createdReply.id);

    if (parentReplyId) {
      closeDesktopReplyTarget();
      setMobileReplyTarget((currentTarget) =>
        currentTarget?.id === parentReplyId ? null : currentTarget,
      );
    } else {
      setMobileReplyTarget(null);
    }
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

  useEffect(() => {
    if (!canShowPsychologistReplyTip) return;
    if (hasShownPsychologistReplyTipThisVisitRef.current) return;
    if (!post) return;

    const timeout = window.setTimeout(() => {
      if (hasShownPsychologistReplyTipThisVisitRef.current) return;
      if (!document.querySelector(PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR)) return;

      hasShownPsychologistReplyTipThisVisitRef.current = true;
      setShowPsychologistReplyTip(true);
      persistPsychologistReplyTipSeen();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [canShowPsychologistReplyTip, persistPsychologistReplyTipSeen, post]);

  const handleTogglePostSave = () => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_salvar", {
        intent: {
          payload: {
            postId: post.id,
          },
          type: "save_post",
        },
      });
      return;
    }

    saveMutation.mutate(post.saved);
  };

  const handleVotePost = (value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            value,
          },
          type: "vote_post",
        },
      });
      return;
    }

    voteMutation.mutate({ value });
  };

  const handleVoteReply = (replyId: string, value: 1 | -1) => {
    if (!post) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_voto", {
        intent: {
          payload: {
            postId: post.id,
            replyId,
            value,
          },
          type: "vote_reply",
        },
      });
      return;
    }

    voteMutation.mutate({ replyId, value });
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !post) return;

    const intent = conversion.consumePendingIntent((candidate) => {
      if (String(candidate.payload?.postId ?? "") !== post.id) return false;
      if (candidate.type === "comment_post") return true;
      if (candidate.type === "save_post" && !post.saved) return true;
      if (candidate.type !== "reply_comment") return false;

      const replyId = String(candidate.payload?.replyId ?? "");

      return Boolean(replyId && findReplyInTree(replies, replyId));
    });

    if (!intent) return;

    if (intent.type === "comment_post") {
      window.setTimeout(focusMainComposer, 0);
      return;
    }

    if (intent.type === "save_post") {
      saveMutation.mutate(post.saved);
      return;
    }

    if (intent.type === "reply_comment") {
      const replyId = String(intent.payload?.replyId ?? "");
      const reply = findReplyInTree(replies, replyId);

      if (reply) {
        window.setTimeout(() => handleReplyTarget(reply), 0);
      }
    }
  }, [conversion, focusMainComposer, handleReplyTarget, post, replies, saveMutation]);

  return {
    activeFocusReplyId,
    activeMobileReplyTarget,
    closeDesktopReplyTarget,
    composerRef,
    createReplyMutation,
    currentUserId,
    deleteReplyError,
    deleteReplyMutation,
    focusMainComposer,
    handleReplyTarget,
    handleShareVideoShared,
    handleTogglePostSave,
    handleVotePost,
    handleVoteReply,
    hasDesktopReplyTargets,
    hasMoreReplies,
    inlineReplyFormRef,
    isInitialRepliesLoading,
    isLoadingMoreReplies,
    isMobile,
    loadMoreRepliesRef,
    mediaPermission,
    post,
    postError,
    postQuery,
    replies,
    repliesError,
    replyError,
    reportError,
    reportMutation,
    reportReplyMutation,
    reportTarget,
    router,
    saveMutation,
    setInlineReplyDraftState,
    setMobileReplyTarget,
    setReportError,
    setReportTarget,
    setReplyError,
    setShareVideoTarget,
    setShowPsychologistReplyTip,
    shareFeedback,
    sharePost,
    shareReply,
    shareVideoTarget,
    shouldExposePsychologistReplyTipTarget,
    showPsychologistReplyTip,
    submitReply,
    uploadReplyMediaMutation,
    visibleInlineReplyTargets,
    voteMutation,
  };
};
