"use client";
import type { AdminCommunityDetail } from "@/api/req/communities";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import { CommunityEditForm } from "../components/community-edit-form";

import { CommunityHeader } from "../components/community-header";
import {
  CommunityCoverageSummaryCard,
  CommunityHighlightCounters,
  LatestCommunityPostsSection,
  UrgentThingsSection,
} from "../components/highlights";
import { PopularPostsCard, TopMentorsCard } from "../components/mentors-and-posts";
import { RulesManager } from "../components/rules-manager";
import { CommunityStatusControl, CommunityTabs } from "../components/status-control";
import { type CommunityTab, cardClass } from "../modules/detail-support";
import { ActivitiesTab } from "./activities-tab";

import { ContentTab } from "./content-tab";

import { RankingTab } from "./ranking-tab";

import { ReportsTab } from "./reports-tab";
import { StatisticsTab } from "./statistics-tab";

export const LoadingState = () => (
  <div className="space-y-5">
    <div className={cn(cardClass, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar a comunidade"
  />
);

export const DetailContent = ({
  activeTab,
  detail,
  pathname,
  slug,
}: {
  activeTab: CommunityTab;
  detail: AdminCommunityDetail;
  pathname: string;
  slug: string;
}) => (
  <div className="space-y-5">
    <section className={cn(cardClass, "overflow-hidden")}>
      <CommunityHeader community={detail.community} postsCount={detail.summary.posts_count} />
      <CommunityTabs activeTab={activeTab} pathname={pathname} />
    </section>

    {activeTab === "geral" ? (
      <>
        <CommunityHighlightCounters detail={detail} />
        <div className="grid min-w-0 gap-4 2xl:grid-cols-5 2xl:items-start">
          <div className="min-w-0 space-y-4 2xl:col-span-3">
            <LatestCommunityPostsSection pathname={pathname} slug={slug} />
            <PopularPostsCard
              communitySlug={detail.community.slug}
              pathname={pathname}
              posts={detail.popular_posts}
            />
          </div>
          <div className="min-w-0 space-y-4 2xl:col-span-2">
            <UrgentThingsSection detail={detail} pathname={pathname} />
            <CommunityCoverageSummaryCard pathname={pathname} slug={slug} />
            <TopMentorsCard slug={slug} />
          </div>
        </div>
      </>
    ) : null}

    {activeTab === "estatisticas" ? (
      <StatisticsTab createdAt={detail.community.created_at} slug={slug} />
    ) : null}

    {activeTab === "dados" ? (
      <div className="space-y-5">
        <CommunityEditForm community={detail.community} id={slug} onDone={() => undefined} />
        <RulesManager id={slug} rules={detail.rules} />
        <CommunityStatusControl community={detail.community} id={slug} />
      </div>
    ) : null}

    {activeTab === "conteudo" ? (
      <ContentTab createdAt={detail.community.created_at} slug={slug} />
    ) : null}
    {activeTab === "ranking" ? <RankingTab slug={slug} /> : null}
    {activeTab === "denuncias" ? <ReportsTab slug={slug} /> : null}
    {activeTab === "atividades" ? <ActivitiesTab slug={slug} /> : null}
  </div>
);
