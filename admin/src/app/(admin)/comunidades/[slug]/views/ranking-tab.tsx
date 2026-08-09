"use client";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useAdminCommunityRanking } from "@/api/callers/communities";
import type { AdminCommunityRankingItem, AdminCommunityRankingQuery } from "@/api/req/communities";
import { VerifiedBadgeIcon } from "@/components/admin-icons";
import { renderableImageSrc } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { formatRankingCrp } from "../components/content-card";
import { PaginationControls, QueryStatus } from "../components/content-controls";
import { StatusBadge } from "../components/content-shared";
import { cardClass, initials, numberFormatter } from "../modules/detail-support";

export const RankingTrend = ({ item }: { item: AdminCommunityRankingItem }) => {
  if (item.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <ArrowUp className="h-4 w-4" /> subiu {item.position_delta}
      </span>
    );
  }
  if (item.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <ArrowDown className="h-4 w-4" /> caiu {Math.abs(item.position_delta ?? 0)}
      </span>
    );
  }
  if (item.trend === "new") return <span className="text-primary">Novo no ranking</span>;

  return <span className="text-muted">estável</span>;
};

export const RankingTab = ({ slug }: { slug: string }) => {
  const [query, setQuery] = useState<AdminCommunityRankingQuery>({
    limit: 10,
    page: 1,
    period: "30d",
    q: "",
  });
  const result = useAdminCommunityRanking(slug, query);
  const updateQuery = (patch: Partial<AdminCommunityRankingQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Ranking da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Todos os psicólogos participantes recebem uma posição, inclusive com score zero.
          </p>
        </div>
        <StatusBadge tone="muted">
          {numberFormatter.format(result.data?.count ?? 0)} psicólogos
        </StatusBadge>
      </div>
      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="h-11 w-full rounded-control border border-border bg-surface pl-10 pr-3 text-sm font-bold outline-none transition focus:border-primary"
          onChange={(event) => updateQuery({ q: event.target.value })}
          placeholder="Buscar psicólogo participante"
          value={query.q ?? ""}
        />
      </label>
      <div className="mt-5 space-y-3">
        <QueryStatus
          error={result.error}
          loading={result.isLoading}
          onRetry={() => void result.refetch()}
        />
        {result.data?.data.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhum psicólogo participante encontrado.
          </p>
        ) : null}
        {result.data?.data.map((item) => {
          const formattedCrp = formatRankingCrp(item.mentor.crp);
          const avatarSrc = renderableImageSrc(item.mentor.avatar);

          return (
            <article
              className="grid gap-4 rounded-2xl border border-border bg-surface p-4 xl:grid-cols-[1fr_auto] xl:items-center"
              key={item.mentor.id}
            >
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
                  #{item.position}
                </span>
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-black text-primary">
                  {avatarSrc ? (
                    <Image
                      alt={`Avatar de ${item.mentor.name}`}
                      className="object-cover"
                      fill
                      sizes="48px"
                      src={avatarSrc}
                      unoptimized
                    />
                  ) : (
                    initials(item.mentor.name)
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-foreground">{item.mentor.name}</h3>
                    {item.mentor.verified ? (
                      <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-4 w-4" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formattedCrp ? `CRP ${formattedCrp}` : "CRP não informado"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs xl:min-w-[220px] xl:justify-end">
                <span className="min-w-[72px]">
                  <strong className="block text-2xl text-foreground">
                    {numberFormatter.format(item.score)}
                  </strong>
                  <span className="font-bold text-muted">Score</span>
                </span>
                <span className="font-black">
                  <RankingTrend item={item} />
                  {item.previous_position ? (
                    <span className="ml-1 text-muted">· antes #{item.previous_position}</span>
                  ) : null}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {result.data ? (
        <div className="mt-5">
          <PaginationControls
            page={result.data.page}
            pages={result.data.pages}
            setPage={(page) => updateQuery({ page })}
          />
        </div>
      ) : null}
    </section>
  );
};
