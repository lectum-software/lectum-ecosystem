"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImportantActionTracking } from "@/api/callers/analytics";
import {
  useDirectoryPsychologist,
  useDirectoryPsychologistPosts,
  useDirectoryPsychologistProfileView,
  useDirectoryPsychologistReviews,
  useInfiniteDirectoryPsychologistPosts,
  useInfiniteDirectoryPsychologistReviews,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type { DirectoryReviewSummary } from "@/api/generator/types/directory";
import type { PostListPost } from "@/api/generator/types/posts";
import type { ImportantActionTrackingRequest } from "@/api/req/analytics";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumShareTargetFromHighlightedReply,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { AboutTab } from "./components/about";
import { ProfileHero, ProfileMobileStickyHeader } from "./components/hero";
import { PostsTab } from "./components/publications";
import { ReviewsTab } from "./components/reviews";
import { InactivePublicProfileState } from "./components/shared";
import { WhatsAppCta } from "./components/whatsapp-cta";
import {
  currentAnalyticsPath,
  EMPTY_PUBLICATIONS_SUMMARY,
  flattenProfilePublicationPages,
  flattenProfileReviewPages,
  getDisplayMode,
  getProfilePublicationReplyId,
  normalizeTab,
  PAGE_LIMIT,
  type ProfileTab,
  type ProfileTabHistoryMode,
  type ProfileTabNavigationOptions,
  profilePublicationHref,
  resolveErrorMessage,
  scrollProfileContentIntoView,
} from "./modules/support";

export const PsychologistProfileLogic = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [shareFeedback, setShareFeedback] = useState(false);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const [pendingScrollTab, setPendingScrollTab] = useState<ProfileTab | null>(null);
  const trackedProfileViewRef = useRef<string | null>(null);
  const trackedTabOpenRef = useRef<string | null>(null);
  const currentUser = useAppSelector((state) => state.user);
  const conversion = useProgressiveConversion();
  const id = params.id;
  const canInspectInactiveOwnProfile = currentUser?.role === "psicologo" && currentUser.id === id;
  const ownFreeProfile = usePsychologistFreeProfile({
    enabled: Boolean(canInspectInactiveOwnProfile),
  });

  const urlParams = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const activeTab = useMemo(() => normalizeTab(urlParams.get("tab")), [urlParams]);
  const previewListQuery = useMemo(() => ({ page: 1, limit: PAGE_LIMIT }), []);
  const infiniteListQuery = useMemo(() => ({ limit: PAGE_LIMIT }), []);

  const profileQuery = useDirectoryPsychologist(id);
  const { mutate: trackProfileView } = useDirectoryPsychologistProfileView(id);
  const importantActionTracking = useImportantActionTracking();
  const sharePostMutation = useSharePost();
  const shareReplyMutation = useShareReply();
  const profile = profileQuery.data;
  const loadedProfileId = profile?.id;
  const postsPreview = useDirectoryPsychologistPosts(
    id,
    previewListQuery,
    activeTab === "geral" && Boolean(profile),
  );
  const reviewsPreview = useDirectoryPsychologistReviews(
    id,
    previewListQuery,
    activeTab === "geral" && Boolean(profile),
  );
  const publications = useInfiniteDirectoryPsychologistPosts(
    id,
    infiniteListQuery,
    activeTab === "publicacoes" && Boolean(profile),
  );
  const profileReviews = useInfiniteDirectoryPsychologistReviews(
    id,
    infiniteListQuery,
    activeTab === "avaliacoes" && Boolean(profile),
  );
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });
  const publicationItems = useMemo(
    () => flattenProfilePublicationPages(publications.data?.pages),
    [publications.data?.pages],
  );
  const reviewItems = useMemo(
    () => flattenProfileReviewPages(profileReviews.data?.pages),
    [profileReviews.data?.pages],
  );
  const firstPublicationPage = publications.data?.pages[0];
  const firstReviewPage = profileReviews.data?.pages[0];
  const {
    fetchNextPage: fetchNextPublicationsPage,
    hasNextPage: hasNextPublicationsPage,
    isFetching: isFetchingPublications,
    isFetchingNextPage: isFetchingNextPublicationsPage,
  } = publications;
  const {
    fetchNextPage: fetchNextReviewsPage,
    hasNextPage: hasNextReviewsPage,
    isFetching: isFetchingReviews,
    isFetchingNextPage: isFetchingNextReviewsPage,
  } = profileReviews;
  const loadMorePublications = useCallback(() => {
    if (!hasNextPublicationsPage || isFetchingPublications || isFetchingNextPublicationsPage) {
      return;
    }

    void fetchNextPublicationsPage();
  }, [
    fetchNextPublicationsPage,
    hasNextPublicationsPage,
    isFetchingNextPublicationsPage,
    isFetchingPublications,
  ]);
  const loadMoreReviews = useCallback(() => {
    if (!hasNextReviewsPage || isFetchingReviews || isFetchingNextReviewsPage) {
      return;
    }

    void fetchNextReviewsPage();
  }, [fetchNextReviewsPage, hasNextReviewsPage, isFetchingNextReviewsPage, isFetchingReviews]);

  useEffect(() => {
    if (!loadedProfileId || loadedProfileId !== id) return;
    if (trackedProfileViewRef.current === loadedProfileId) return;

    trackedProfileViewRef.current = loadedProfileId;
    trackProfileView();
  }, [id, loadedProfileId, trackProfileView]);

  const trackProfileTabOpen = useCallback(
    (tab: Extract<ProfileTab, "avaliacoes" | "publicacoes">) => {
      if (!loadedProfileId || loadedProfileId !== id) return;
      if (currentUser?.id === loadedProfileId) return;

      const analyticsIdentity = getOrCreateAnalyticsIdentity();
      if (!analyticsIdentity) return;

      const actionType: ImportantActionTrackingRequest["action_type"] =
        tab === "publicacoes"
          ? "psychologist_profile_publications_tab_open"
          : "psychologist_profile_reviews_tab_open";

      void importantActionTracking
        .mutateAsync({
          action_type: actionType,
          display_mode: getDisplayMode(),
          occurred_at: new Date().toISOString(),
          page_kind: "psychologist_profile",
          path: currentAnalyticsPath(),
          session_id: analyticsIdentity.sessionId,
          target_id: loadedProfileId,
          target_type: "psychologist",
          visitor_id: analyticsIdentity.visitorId,
        })
        .catch(() => {
          // O rastreamento não deve bloquear a navegação entre abas do perfil.
        });
    },
    [currentUser?.id, id, importantActionTracking, loadedProfileId],
  );

  useEffect(() => {
    if (activeTab !== "publicacoes" && activeTab !== "avaliacoes") {
      trackedTabOpenRef.current = loadedProfileId ? `${loadedProfileId}:geral` : null;
      return;
    }

    if (!loadedProfileId || loadedProfileId !== id) return;

    const trackingKey = `${loadedProfileId}:${activeTab}`;
    if (trackedTabOpenRef.current === trackingKey) return;

    trackedTabOpenRef.current = trackingKey;
    trackProfileTabOpen(activeTab);
  }, [activeTab, id, loadedProfileId, trackProfileTabOpen]);

  const navigateWithParams = useCallback(
    (mutate: (next: URLSearchParams) => void, historyMode: ProfileTabHistoryMode = "push") => {
      const next = new URLSearchParams(searchParamsString);
      mutate(next);
      const queryString = next.toString();
      const href = `/psicologos/${id}${queryString ? `?${queryString}` : ""}`;

      if (
        typeof window !== "undefined" &&
        `${window.location.pathname}${window.location.search}` === href
      ) {
        return;
      }

      if (historyMode === "replace") {
        router.replace(href, { scroll: false });
        return;
      }

      router.push(href, { scroll: false });
    },
    [id, router, searchParamsString],
  );

  const setActiveTab = useCallback(
    (tab: ProfileTab, options?: ProfileTabNavigationOptions) => {
      if (tab === activeTab) {
        setPendingScrollTab(null);
        return;
      }

      if (options?.scrollToContentTop) {
        setPendingScrollTab(tab);
      } else {
        setPendingScrollTab(null);
      }

      navigateWithParams((next) => {
        if (tab === "geral") next.delete("tab");
        else next.set("tab", tab);
        next.delete("postsPage");
        next.delete("reviewsPage");
      }, options?.history ?? "push");
    },
    [activeTab, navigateWithParams],
  );

  useEffect(() => {
    if (!pendingScrollTab) return;
    if (activeTab !== pendingScrollTab) return;
    if (typeof window === "undefined") return;

    const targetIsReady =
      pendingScrollTab === "publicacoes"
        ? !publications.isLoading
        : pendingScrollTab === "avaliacoes"
          ? !profileReviews.isLoading
          : true;

    if (!targetIsReady) return;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        scrollProfileContentIntoView();
        setPendingScrollTab(null);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeTab, pendingScrollTab, profileReviews.isLoading, publications.isLoading]);

  const toggleFavorite = () => {
    if (!profile) return;
    if (currentUser?.id && currentUser.id === profile.id) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_favorito", {
        intent: {
          payload: {
            psychologistId: profile.id,
          },
          type: "favorite_psychologist",
        },
      });
      return;
    }

    if (profile.favorited) {
      unfavoritePsychologist.mutate(profile.id);
      return;
    }

    favoritePsychologist.mutate(profile.id);
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || !profile) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" &&
        String(candidate.payload?.psychologistId ?? "") === profile.id,
    );
    const psychologistId = String(intent?.payload?.psychologistId ?? "");

    if (!psychologistId || psychologistId !== profile.id || profile.favorited) return;
    if (currentUser?.id && currentUser.id === profile.id) return;

    favoritePsychologist.mutate(profile.id);
  }, [conversion, currentUser?.id, favoritePsychologist, profile]);

  const shareProfile = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Perfil profissional Lectum", url });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setShareFeedback(true);
      window.setTimeout(() => setShareFeedback(false), 2500);
    } catch {
      setShareFeedback(false);
    }
  };

  const sharePost = async (post: PostListPost) => {
    if (typeof window === "undefined") return;

    const relativeUrl = profilePublicationHref(post);
    const socialTarget =
      createLectumSharePostMediaTarget(post, { relativeUrl }) ??
      createLectumShareTargetFromHighlightedReply(post);
    if (socialTarget) {
      setShareVideoTarget(socialTarget);
      return;
    }

    const replyId = getProfilePublicationReplyId(post);
    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl,
        replyId,
        title: post.title,
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    if (shareVideoTarget.replyId) {
      shareReplyMutation.mutate({
        postId: shareVideoTarget.postId,
        replyId: shareVideoTarget.replyId,
        body: { channel },
      });
    } else {
      sharePostMutation.mutate({ id: shareVideoTarget.postId, body: { channel } });
    }
    setShareFeedback(true);
    window.setTimeout(() => setShareFeedback(false), 2500);
  };

  const goBack = () => {
    if (activeTab !== "geral") {
      setActiveTab("geral", { history: "replace" });
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/psicologos");
  };

  const goToProfileEdit = () => {
    router.push("/app/profissional/perfil/configurar");
  };

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const isCheckingInactiveOwnProfile =
    profileQuery.isError &&
    Boolean(canInspectInactiveOwnProfile) &&
    ownFreeProfile.profile.isLoading;
  const showInactiveOwnProfileState = Boolean(
    profileQuery.isError &&
      canInspectInactiveOwnProfile &&
      ownFreeProfile.profile.data &&
      !ownFreeProfile.profile.data.activation.active,
  );
  const showInitialLoading = (profileQuery.isLoading && !profile) || isCheckingInactiveOwnProfile;
  const profileErrorMessage =
    profileQuery.isError && !showInactiveOwnProfileState
      ? resolveErrorMessage(profileQuery.error, "Não foi possível carregar o perfil profissional.")
      : null;
  const isViewingOwnProfile = Boolean(
    currentUser?.id && profile?.id && currentUser.id === profile.id,
  );
  const canEditProfile = currentUser?.role === "psicologo" && isViewingOwnProfile;
  const canInteractWithPosts = Boolean(currentUser?.id);
  const canReviewProfile = !isViewingOwnProfile;
  const favoriteDisabledReason = isViewingOwnProfile
    ? "Você não pode favoritar o próprio perfil"
    : null;
  const canFavoriteProfile = !favoriteDisabledReason;

  const emptySummary = useMemo<DirectoryReviewSummary>(
    () => ({
      rating_avg: profile?.rating_avg ?? 0,
      rating_count: profile?.rating_count ?? 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
    [profile?.rating_avg, profile?.rating_count],
  );

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="!pt-0 bg-surface-muted dark:bg-background sm:!pt-0"
      desktopSidebarDefaultCollapsed
      showNavigation
      showMobileNavigation={false}
    >
      <div className="-mx-5 overflow-x-hidden bg-surface-muted dark:bg-background">
        <section className="mx-auto grid w-screen max-w-[430px] bg-surface-muted dark:bg-background sm:max-w-[430px] lg:max-w-[760px]">
          <div className="grid gap-0 pb-[calc(var(--lectum-mobile-nav-aware-fab-bottom)+4rem)] lg:pb-10">
            {shareFeedback ? (
              <div className="mx-3 pt-3">
                <InlineAlert title="Link copiado" variant="success">
                  Compartilhamento preparado com o link público seguro deste perfil.
                </InlineAlert>
              </div>
            ) : null}

            {showInitialLoading ? (
              <div className="grid min-h-[45vh] place-items-center bg-background">
                <LoadingState label="Carregando perfil profissional" />
              </div>
            ) : null}

            {!showInitialLoading && showInactiveOwnProfileState ? (
              <InactivePublicProfileState
                pendingFields={ownFreeProfile.profile.data?.activation.pending_fields ?? []}
              />
            ) : null}

            {!showInitialLoading && !showInactiveOwnProfileState && profileErrorMessage ? (
              <div className="mx-3 grid gap-4 bg-background px-0 py-8">
                <InlineAlert title="Perfil indisponível" variant="error">
                  {profileErrorMessage}
                </InlineAlert>
                <Button asChild variant="outline">
                  <Link href="/psicologos">Voltar para a busca</Link>
                </Button>
              </div>
            ) : null}

            {!showInitialLoading &&
            !showInactiveOwnProfileState &&
            !profileErrorMessage &&
            profile ? (
              <>
                <ProfileHero
                  canFavorite={canFavoriteProfile}
                  canEditProfile={canEditProfile}
                  favoriteDisabledReason={favoriteDisabledReason}
                  favoritePending={favoritePendingId === profile.id}
                  onBack={goBack}
                  onEditProfile={goToProfileEdit}
                  onShareProfile={shareProfile}
                  onToggleFavorite={toggleFavorite}
                  profile={profile}
                />

                <ProfileMobileStickyHeader
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  profile={profile}
                />

                <div className="grid gap-0" id="profile-content">
                  {activeTab === "geral" ? (
                    <AboutTab
                      canReviewProfile={canReviewProfile}
                      canInteractPosts={canInteractWithPosts}
                      onTabChange={setActiveTab}
                      onSharePost={sharePost}
                      postsPreview={{
                        isError: postsPreview.isError,
                        isLoading: postsPreview.isLoading,
                        highlightedPublication: postsPreview.data?.highlighted_publication ?? null,
                        posts: postsPreview.data?.data ?? [],
                        total: postsPreview.data?.count ?? 0,
                      }}
                      profile={profile}
                      reviewsPreview={{
                        isError: reviewsPreview.isError,
                        isLoading: reviewsPreview.isLoading,
                        highlightedReview: reviewsPreview.data?.highlighted_review ?? null,
                        reviews: reviewsPreview.data?.data ?? [],
                        summary: reviewsPreview.data?.summary ?? emptySummary,
                      }}
                    />
                  ) : null}
                  {activeTab === "publicacoes" ? (
                    <PostsTab
                      canInteract={canInteractWithPosts}
                      error={publications.error}
                      hasNextPage={Boolean(publications.hasNextPage)}
                      isError={publications.isError}
                      isFetching={publications.isFetching}
                      isFetchingNextPage={publications.isFetchingNextPage}
                      isLoading={publications.isLoading}
                      onBackToOverview={() => setActiveTab("geral", { history: "replace" })}
                      onLoadMore={loadMorePublications}
                      onShare={sharePost}
                      posts={publicationItems}
                      summary={firstPublicationPage?.summary ?? EMPTY_PUBLICATIONS_SUMMARY}
                      total={firstPublicationPage?.count ?? 0}
                    />
                  ) : null}
                  {activeTab === "avaliacoes" ? (
                    <ReviewsTab
                      canReviewProfile={canReviewProfile}
                      error={profileReviews.error}
                      hasNextPage={Boolean(profileReviews.hasNextPage)}
                      isError={profileReviews.isError}
                      isFetching={profileReviews.isFetching}
                      isFetchingNextPage={profileReviews.isFetchingNextPage}
                      isLoading={profileReviews.isLoading}
                      onBackToOverview={() => setActiveTab("geral", { history: "replace" })}
                      onLoadMore={loadMoreReviews}
                      profileId={profile.id}
                      reviews={reviewItems}
                      summary={firstReviewPage?.summary ?? emptySummary}
                    />
                  ) : null}
                </div>

                <WhatsAppCta profile={profile} trafficOrigin={urlParams.get("traffic_origin")} />
              </>
            ) : null}
          </div>
        </section>
      </div>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};
