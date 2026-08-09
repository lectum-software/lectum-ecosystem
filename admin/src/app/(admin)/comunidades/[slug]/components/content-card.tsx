"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bookmark,
  Eye,
  FileText,
  MessageCircle,
  Reply,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { AdminCommunityContentAuthor, AdminCommunityContentItem } from "@/api/req/communities";
import { VerifiedBadgeIcon, WhatsAppIcon } from "@/components/admin-icons";
import { isAdminPublicMediaUrl, renderableImageSrc } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import { formatDateTime, initials, numberFormatter } from "../modules/detail-support";
import { ContentMediaThumbnail } from "./content-media";
import { adminContentDetailHref, StatusBadge } from "./content-shared";

export const ContentMetrics = ({ item }: { item: AdminCommunityContentItem }) => {
  const hasWhatsappMetric = item.author.role === "psicologo";

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Eye aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.views_count)} visualizações
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowUp aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.upvotes_count)} upvotes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowDown aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.downvotes_count)} downvotes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.comments_count)} comentários
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bookmark aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.saves_count)} salvos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Share2 aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.shares_count)} compartilhamentos
        </span>
        {hasWhatsappMetric ? (
          <span className="inline-flex items-center gap-1.5">
            <WhatsAppIcon aria-hidden />
            {numberFormatter.format(item.metrics.whatsapp_clicks_count)} cliques WhatsApp
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          {numberFormatter.format(item.metrics.reports_count)} denúncias
        </span>
      </div>
    </div>
  );
};

export const contentItemKindPresentation = (item: AdminCommunityContentItem) => {
  if (item.type === "post") return { icon: FileText, label: "Post" };
  if (item.content_kind.endsWith("_reply")) return { icon: Reply, label: "Resposta" };
  if (item.content_kind === "patient_comment") return { icon: MessageCircle, label: "Comentário" };

  return null;
};

export const ContentItemHeader = ({ item }: { item: AdminCommunityContentItem }) => {
  const kindPresentation = contentItemKindPresentation(item);
  const KindIcon = kindPresentation?.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.status === "removed" ? <StatusBadge tone="muted">Removido</StatusBadge> : null}
      {item.status === "blocked" ? <StatusBadge tone="danger">Bloqueado</StatusBadge> : null}
      {kindPresentation && KindIcon ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-muted">
          <KindIcon aria-hidden className="h-4 w-4" />
          <span>{kindPresentation.label}</span>
        </span>
      ) : (
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-muted">
          {item.content_kind_label}
        </span>
      )}
      <span className="text-xs font-bold text-muted">{formatDateTime(item.created_at)}</span>
    </div>
  );
};

export const ContentItemBody = ({ item }: { item: AdminCommunityContentItem }) => {
  const hasText = item.excerpt.trim().length > 0;

  if (item.type === "post") {
    return (
      <div className="min-w-0">
        <h3 className="text-base font-black text-foreground">{item.title || "Post sem título"}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{hasText ? item.excerpt : "Sem texto."}</p>
      </div>
    );
  }

  if (!hasText) return null;

  return <p className="text-sm leading-6 text-muted">{item.excerpt}</p>;
};

export const crpRegionByUf: Record<string, string> = {
  AC: "20",
  AL: "15",
  AM: "20",
  AP: "10",
  BA: "03",
  CE: "11",
  DF: "01",
  ES: "16",
  GO: "09",
  MA: "22",
  MG: "04",
  MS: "14",
  MT: "18",
  PA: "10",
  PB: "13",
  PE: "02",
  PI: "21",
  PR: "08",
  RJ: "05",
  RN: "17",
  RO: "20",
  RR: "20",
  RS: "07",
  SC: "12",
  SE: "19",
  SP: "06",
  TO: "23",
};

export const formatRankingCrp = (crp: string | null) => {
  const value = crp?.trim();

  if (!value) return null;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const slashIndex = normalized.lastIndexOf("/");
  const regionSource = slashIndex >= 0 ? normalized.slice(0, slashIndex) : normalized;
  const registrationSource = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  const regionDigits = regionSource.match(/\d{1,2}/)?.[0];
  const regionUf = regionSource.match(/\b[A-Z]{2}\b/)?.[0];
  const fallbackRegionDigits = normalized.match(/\d{1,2}/)?.[0];
  const region = (
    regionDigits ??
    (regionUf ? crpRegionByUf[regionUf] : null) ??
    fallbackRegionDigits
  )
    ?.padStart(2, "0")
    .slice(-2);
  const registrationDigits = registrationSource.replace(/\D/g, "");
  const registration = (registrationDigits.replace(/^0+/, "") || "0").padStart(4, "0").slice(-4);

  if (!region || !registrationDigits) return null;

  return `${region}/${registration}`;
};

export const psychologistRoleLabel = (gender?: string | null) =>
  gender?.trim().toLowerCase() === "feminino" ? "Psicóloga" : "Psicólogo";

export const AuthorIdentity = ({
  author,
  className,
}: {
  author: AdminCommunityContentAuthor;
  className?: string;
}) => {
  const avatarSrc = renderableImageSrc(author.avatar);
  const roleLabel = author.role === "psicologo" ? psychologistRoleLabel(author.gender) : "Paciente";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft text-xs font-black text-primary">
        {avatarSrc ? (
          <Image
            alt={`Foto de perfil de ${author.name}`}
            className="object-cover"
            fill
            sizes="40px"
            src={avatarSrc}
            unoptimized={isAdminPublicMediaUrl(author.avatar)}
          />
        ) : (
          initials(author.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-black text-foreground">{author.name}</span>
          {author.verified ? <VerifiedBadgeIcon aria-label="Perfil verificado" /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span>{roleLabel}</span>
          {author.anonymous ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 font-black text-primary">
              Post feito anonimamente
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const ContentAuthorIdentity = ({
  className,
  item,
}: {
  className?: string;
  item: AdminCommunityContentItem;
}) => <AuthorIdentity author={item.author} className={className} />;

export const ContentItemMain = ({ item }: { item: AdminCommunityContentItem }) => {
  const mediaTextGridClass = cn(
    "mt-3 grid min-w-0 gap-3",
    item.media && "sm:grid-cols-[112px_1fr]",
  );

  if (item.type === "comment") {
    return (
      <div className="min-w-0">
        <ContentItemHeader item={item} />
        <ContentAuthorIdentity className="mt-3" item={item} />
        <div className={mediaTextGridClass}>
          <ContentMediaThumbnail item={item} />
          <div className="min-w-0">
            <ContentItemBody item={item} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ContentItemHeader item={item} />
      <ContentAuthorIdentity className="mt-3" item={item} />
      <div className={mediaTextGridClass}>
        <ContentMediaThumbnail item={item} />
        <ContentItemBody item={item} />
      </div>
    </div>
  );
};

export const ContentItemCard = ({
  item,
  slug,
}: {
  item: AdminCommunityContentItem;
  slug: string;
}) => (
  <article className="rounded-2xl border border-border bg-surface p-4">
    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
      <ContentItemMain item={item} />
      <div className="flex justify-end gap-2 lg:flex-col">
        <Link
          aria-label="Ver analytics do conteúdo no Admin"
          className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-primary/20 text-primary transition hover:bg-primary-soft"
          href={adminContentDetailHref(slug, item)}
          title="Analytics"
        >
          <BarChart3 aria-hidden className="h-4 w-4" />
          <span className="sr-only">Analytics</span>
        </Link>
        {item.status === "published" ? (
          <Link
            aria-label="Ver conteúdo no site"
            className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
            href={toPublicFrontendHref(item.public_url)}
            rel="noreferrer"
            target="_blank"
            title="Ver no site"
          >
            <Eye aria-hidden className="h-4 w-4" />
            <span className="sr-only">Ver no site</span>
          </Link>
        ) : (
          <span
            aria-label="Conteúdo indisponível no site público"
            className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface-muted text-subtle"
            role="img"
            title="Indisponível no site público"
          >
            <Eye aria-hidden className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
    <ContentMetrics item={item} />
  </article>
);
