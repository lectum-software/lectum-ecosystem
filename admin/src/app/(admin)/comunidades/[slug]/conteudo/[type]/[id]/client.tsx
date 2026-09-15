"use client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAdminCommunityContentDetail } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import { cn } from "@/lib/utils";
import { ModerationSection, RemovalSection } from "./components/moderation";

import { HeaderSection, PreviewSection } from "./components/preview";

import { VideoAnalyticsSection } from "./components/video-analytics";
import {
  CONTENT_DETAIL_QUERY,
  cardClass,
  normalizeTargetType,
  pageClass,
} from "./modules/content-support";

export const AdminCommunityContentDetailClient = ({
  contentId,
  contentType,
  slug,
}: {
  contentId: string;
  contentType: string;
  slug: string;
}) => {
  const normalizedType = normalizeTargetType(contentType);
  const detailQuery = useAdminCommunityContentDetail(
    slug,
    normalizedType ?? "post",
    contentId,
    CONTENT_DETAIL_QUERY,
    {
      enabled: Boolean(normalizedType),
    },
  );
  const detail = detailQuery.data;

  if (!normalizedType) {
    return (
      <div className={pageClass}>
        <div className={cn(cardClass, "p-5")}>
          <AlertTriangle className="h-6 w-6 text-danger" aria-hidden />
          <h1 className="mt-3 text-xl font-black text-foreground">Tipo de conteúdo inválido</h1>
          <p className="mt-2 text-sm text-muted">Use post, comment ou reply na rota.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      {detailQuery.isLoading ? (
        <div className={cn(cardClass, "grid min-h-64 place-items-center p-8")}>
          <span className="inline-flex items-center gap-2 text-sm font-black text-muted">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
            Carregando dados do conteúdo
          </span>
        </div>
      ) : null}

      {detailQuery.isError ? (
        <div className={cn(cardClass, "p-5")}>
          <AlertTriangle aria-hidden className="h-6 w-6 text-danger" />
          <h1 className="mt-3 text-xl font-black text-foreground">Conteúdo indisponível</h1>
          <p className="mt-2 text-sm font-bold text-muted">{resolveApiError(detailQuery.error)}</p>
        </div>
      ) : null}

      {detail ? (
        <>
          <HeaderSection detail={detail} />
          <PreviewSection detail={detail} />
          <VideoAnalyticsSection detail={detail} />
          <ModerationSection detail={detail} />
          <RemovalSection
            detail={detail}
            onRemoved={() => void detailQuery.refetch()}
            slug={slug}
          />
        </>
      ) : null}
    </div>
  );
};
