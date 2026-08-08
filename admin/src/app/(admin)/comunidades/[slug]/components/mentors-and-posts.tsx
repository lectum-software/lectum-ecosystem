"use client";

import { ArrowUp, ChevronRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useAdminCommunityRanking } from "@/api/callers/communities";
import type {
  AdminCommunityPopularPost,
  AdminCommunityRankingItem,
  AdminCommunityRankingQuery,
} from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { cardClass, initials, SummaryBlockTitle } from "../modules/detail-support";
import { formatRankingCrp, VerifiedBadgeIcon } from "./content-card";

import { QueryStatus } from "./content-controls";

import { communityTabHref, PopularPostRow } from "./highlights";

export const TopMentorRow = ({ item }: { item: AdminCommunityRankingItem }) => {
  const formattedCrp = formatRankingCrp(item.mentor.crp);

  return (
    <article className="w-full max-w-full overflow-hidden rounded-2xl border border-border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
          #{item.position}
        </span>
        <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-black text-primary">
          {item.mentor.avatar ? (
            <Image
              alt={`Avatar de ${item.mentor.name}`}
              className="object-cover"
              fill
              sizes="40px"
              src={item.mentor.avatar}
              unoptimized
            />
          ) : (
            initials(item.mentor.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-black text-foreground">{item.mentor.name}</p>
            {item.mentor.verified ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4" />
            ) : null}
          </div>
          <p className="text-xs text-muted">
            {formattedCrp ? `CRP ${formattedCrp}` : "CRP não informado"}
          </p>
        </div>
      </div>
    </article>
  );
};

export const TopMentorsCard = ({ slug }: { slug: string }) => {
  const topMentorsQuery = useMemo<AdminCommunityRankingQuery>(
    () => ({
      limit: 3,
      page: 1,
      period: "30d",
      q: "",
    }),
    [],
  );
  const ranking = useAdminCommunityRanking(slug, topMentorsQuery);
  const mentors = (ranking.data?.data ?? []).slice(0, 3);
  const showQueryStatus = ranking.isLoading || Boolean(ranking.error);

  return (
    <section className={cn(cardClass, "min-w-0 overflow-hidden p-5")}>
      <SummaryBlockTitle icon={ShieldCheck} title="Top mentores" />
      {showQueryStatus ? (
        <div className="mt-4">
          <QueryStatus
            error={ranking.error}
            loading={ranking.isLoading}
            onRetry={() => void ranking.refetch()}
          />
        </div>
      ) : null}
      {!ranking.isLoading && !ranking.error && mentors.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum psicólogo participante foi encontrado nesta comunidade.
        </p>
      ) : null}
      {mentors.length > 0 ? (
        <div className="mt-4 space-y-3">
          {mentors.map((mentor) => (
            <TopMentorRow item={mentor} key={mentor.mentor.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export const PopularPostsCard = ({
  communitySlug,
  pathname,
  posts,
}: {
  communitySlug: string;
  pathname: string;
  posts: AdminCommunityPopularPost[];
}) => (
  <section className={cn(cardClass, "p-5")}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SummaryBlockTitle icon={ArrowUp} title="Posts mais populares" />
      <Link
        className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-primary/20 bg-transparent px-3.5 text-xs font-black text-primary transition hover:border-primary/35 hover:bg-primary-soft"
        href={communityTabHref(pathname, "conteudo")}
      >
        Ver todos
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </div>
    {posts.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhum post publicado foi encontrado nesta comunidade.
      </p>
    ) : (
      <div className="mt-4 overflow-hidden">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[34%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="text-xs text-muted">
            <tr>
              <th className="border-b border-border py-3 pr-4 font-black">Post</th>
              <th className="border-b border-border px-3 py-3 font-black">Autor</th>
              <th className="border-b border-border px-2 py-3 text-center font-black">Upvotes</th>
              <th className="border-b border-border px-2 py-3 text-center font-black">
                Comentários
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <PopularPostRow communitySlug={communitySlug} key={post.id} post={post} />
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
