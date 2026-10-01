"use client";

import { BarChart3, Eye, FileText, Reply } from "lucide-react";
import Link from "next/link";
import type { AdminGlobalContentItem } from "@/api/req/communities/global-content";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import {
  ContentAuthorIdentity,
  ContentMetrics,
  isVideoContentItem,
} from "../[slug]/components/content-card";
import { ContentMediaThumbnail } from "../[slug]/components/content-media";
import { adminContentDetailHref } from "../[slug]/components/content-shared";
import { ContentVideoDownloadActions } from "../[slug]/components/content-video-download-actions";

export function ContentRow({ item }: { item: AdminGlobalContentItem }) {
  const isPost = item.type === "post";
  const KindIcon = isPost ? FileText : Reply;
  return (
    <article className="border-b border-border bg-surface p-4 last:border-b-0 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ContentAuthorIdentity item={item} />
        <div className="flex items-center gap-2 text-xs text-muted">
          <KindIcon aria-hidden className="h-4 w-4" />
          {isPost ? "Post" : "Resposta"}
          <span aria-hidden>·</span>
          <time dateTime={item.created_at}>
            {new Intl.DateTimeFormat("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            }).format(new Date(item.created_at))}
          </time>
          {item.status !== "published" ? (
            <span className="rounded bg-surface-muted px-2 py-1">
              {item.status === "removed" ? "Removido" : "Bloqueado"}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        className="mt-3 inline-block max-w-full break-words text-sm font-semibold text-primary hover:underline"
        href={`/comunidades/${encodeURIComponent(item.community.slug)}?tab=conteudo`}
      >
        {item.community.name}
      </Link>
      <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-[1fr_auto]">
        <div
          className={`grid min-w-0 gap-4 ${item.media ? "grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)]" : ""}`}
        >
          {item.media ? (
            <div className="min-w-0 overflow-hidden rounded-lg">
              <ContentMediaThumbnail item={item} />
            </div>
          ) : null}
          <div className="min-w-0 break-words">
            {!isPost && item.parent_post_title ? (
              <p className="mb-1 text-xs text-muted">Em resposta a</p>
            ) : null}
            <h3 className="text-base font-semibold leading-snug">
              {isPost
                ? item.title || "Post sem título"
                : item.parent_post_title || item.title || "Resposta"}
            </h3>
            {item.excerpt ? (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.excerpt}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2 sm:w-32">
          <Link
            aria-label={`Ver métricas de ${isPost ? "post" : "resposta"} de ${item.author.name}`}
            className="grid h-10 w-10 place-items-center rounded-md bg-surface-muted hover:text-primary"
            href={adminContentDetailHref(item.community.slug, item)}
            title="Ver métricas"
          >
            <BarChart3 aria-hidden className="h-4 w-4" />
          </Link>
          {item.status === "published" ? (
            <Link
              aria-label={`Ver conteúdo de ${item.author.name} no site`}
              className="grid h-10 w-10 place-items-center rounded-md bg-surface-muted hover:text-primary"
              href={toPublicFrontendHref(item.public_url)}
              target="_blank"
              rel="noreferrer"
              title="Ver no site"
            >
              <Eye aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
          {isVideoContentItem(item) ? (
            <ContentVideoDownloadActions
              allowArtDownload
              className="w-32"
              compact
              communityId={item.community.id}
              targetId={item.content_id}
              targetType={item.type}
            />
          ) : null}
        </div>
      </div>
      <ContentMetrics item={item} />
    </article>
  );
}
