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
import type { SVGProps } from "react";
import type { AdminCommunityContentAuthor, AdminCommunityContentItem } from "@/api/req/communities";
import { isAdminPublicMediaUrl, renderableImageSrc } from "@/lib/admin-media";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";

import { formatDateTime, initials, numberFormatter } from "../modules/detail-support";
import { ContentMediaThumbnail } from "./content-media";
import { adminContentDetailHref, StatusBadge } from "./content-shared";

export const WhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
    />
  </svg>
);

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

export const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="currentColor"
    />
  </svg>
);

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
