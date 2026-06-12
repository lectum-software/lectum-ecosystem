"use client";

import {
  ArrowLeft,
  BadgePercent,
  Bookmark,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  Languages,
  type LucideIcon,
  MapPin,
  MessageSquareText,
  PencilLine,
  Play,
  Share2,
  ShieldCheck,
  Star,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDirectoryPsychologist,
  useDirectoryPsychologistPosts,
  useDirectoryPsychologistReviews,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistProfile,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistProfileReview,
  DirectoryReviewSummary,
} from "@/api/generator/types/directory";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpNumber } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 5;
const PROFILE_TABS = ["geral", "publicacoes", "avaliacoes"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const tabs: Array<{ label: string; value: ProfileTab }> = [
  { label: "Sobre", value: "geral" },
  { label: "Publicações", value: "publicacoes" },
  { label: "Avaliações", value: "avaliacoes" },
];

const modalityLabel: Record<string, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrido: "Online e presencial",
};

const languageLabel: Record<string, string> = {
  pt: "Português",
  "pt-br": "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
};

const targetAudienceLabel: Record<string, string> = {
  adolescentes: "Adolescentes (12-17)",
  adultos: "Adultos (18-59)",
  criancas: "Crianças (até 11)",
  idosos: "Idosos (60+)",
  casais: "Casais",
  familias: "Famílias",
  lgbtqia_plus: "LGBTQIA+",
};

const normalizeTab = (value: string | null): ProfileTab => {
  if (value === "sobre") return "geral";

  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "geral";
};

const getPageFromParams = (params: URLSearchParams, key: string) => {
  const parsed = Number(params.get(key) || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatHeroRating = (ratingAvg: number) => {
  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" ? "Psicóloga" : "Psicólogo";
};

const getHonorificName = (profile: DirectoryPsychologistProfile) => {
  return profile.name
    .replace(/^(?:Dr\\.?\\s*|Dra\\.?\\s*)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const splitNameWithBadge = (name: string) => {
  const normalized = name.replace(/\s+/g, " ").trim();
  const parts = normalized.split(" ");

  if (parts.length <= 1) {
    return { prefix: "", last: normalized };
  }

  return {
    last: parts.at(-1) ?? "",
    prefix: parts.slice(0, -1).join(" "),
  };
};

const formatRatingNumber = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatDate = (value: string | null) => {
  if (!value) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatCompactDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
};

const translateLanguage = (language: string) => {
  const normalized = language.toLowerCase();

  return languageLabel[normalized] || language;
};

const translateTargetAudience = (target: string) => {
  return targetAudienceLabel[target] || target;
};

const buildBenefitTags = (profile: DirectoryPsychologistProfile) => {
  const tags: Array<{
    icon: typeof BriefcaseBusiness;
    label: string;
  }> = [];

  if (profile.show_experience_tag !== false && profile.verified && profile.formation_years) {
    tags.push({
      icon: BriefcaseBusiness,
      label: `${profile.formation_years} anos de experiência`,
    });
  }

  if (profile.accepts_insurance) {
    tags.push({ icon: ShieldCheck, label: "Aceita convênios" });
  }

  if (profile.social_value) {
    tags.push({ icon: HeartHandshake, label: "Valor social" });
  }

  if (profile.discount_first_session) {
    tags.push({ icon: BadgePercent, label: "Desconto 1ª sessão" });
  }

  return tags;
};

const hasInPersonCare = (modality?: string | null) => {
  const normalized = modality?.toLowerCase() || "";

  return (
    normalized === "presencial" || normalized === "hibrido" || normalized.includes("presencial")
  );
};

const formatAttendanceLabel = (profile: DirectoryPsychologistProfile) => {
  if (hasInPersonCare(profile.modality)) {
    const city = profile.address_city?.trim();
    const state = profile.address_state?.trim().toUpperCase();

    if (city && state) return `Online e Presencial em ${city}/${state}`;
    if (city) return `Online e Presencial em ${city}`;

    return "Online e Presencial";
  }

  if (!profile.modality) return "Modalidade não informada";

  return modalityLabel[profile.modality] || profile.modality;
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontrado")) {
    return "Este perfil não está publicado ou não está disponível para visualização.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar este perfil.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || fallback;
};

const StarRating = ({ rating }: { rating: number }) => {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} de 5 estrelas`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((item) => (
        <Star
          aria-hidden="true"
          className={cn("h-4 w-4 text-warning", item <= filled && "fill-warning")}
          key={item}
        />
      ))}
    </span>
  );
};

const formatList = (items: string[], empty = "Não informado") => {
  const visibleItems = items.map((item) => item.trim()).filter(Boolean);

  return visibleItems.length > 0 ? visibleItems.join(", ") : empty;
};

const ProfileInfoCard = ({
  compact,
  icon: Icon,
  label,
  value,
}: {
  compact?: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <article
    className={cn(
      "box-border rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC]",
      compact ? "px-2.5 py-2" : "px-3 py-2.5",
    )}
  >
    <div className="flex min-h-0 items-start gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#2F8DEB] shadow-[0_4px_12px_rgba(47,141,235,0.08)]">
        <Icon className="h-[14px] w-[14px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[8px] font-medium uppercase leading-none tracking-[0.08em] text-[#94A3B8]">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 break-words text-[11.5px] font-semibold leading-[1.3] text-[#0F172A]",
            compact ? "line-clamp-3" : "line-clamp-4",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  </article>
);

const ProfileSectionCard = ({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) => (
  <section
    className={cn(
      "box-border rounded-[16px] border border-[#E2E8F0] bg-white px-3.5 py-3.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]",
      className,
    )}
  >
    <h2 className="text-[14px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#0F172A]">
      {title}
    </h2>
    {children}
  </section>
);

const ProfileChipList = ({
  emptyMessage,
  items,
}: {
  emptyMessage: string;
  items: DirectoryCatalogItem[];
}) => {
  if (items.length === 0) {
    return <p className="mt-2 text-[12px] leading-[1.55] text-[#64748B]">{emptyMessage}</p>;
  }

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          className="inline-flex min-h-7 items-center rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-2.5 text-[11px] font-semibold leading-none text-[#1E3A8A]"
          key={item.id}
        >
          {item.name}
        </span>
      ))}
    </div>
  );
};

const Pagination = ({
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <Button
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>

      <span className="text-sm font-semibold text-muted">
        Página {currentPage} de {pages}
      </span>

      <Button
        disabled={currentPage >= pages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="outline"
      >
        Próxima
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
};

const ProfileAvatar = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const avatarSrc = resolvePublicMediaUrl(profile.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(profile.avatar);

  return (
    <div
      className="relative grid size-[60px] shrink-0 place-items-center overflow-hidden rounded-[16px] border-[3px] border-white bg-surface-muted text-xl font-extrabold text-primary shadow-[0_10px_22px_rgba(15,23,42,0.14)] sm:size-[68px] sm:rounded-[18px] sm:border-[4px] sm:text-2xl"
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={profile.name}
          className="object-cover"
          fill
          priority
          sizes="(min-width: 640px) 88px, 60px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(profile.name)
      )}
    </div>
  );
};

const ProfileHeroMedia = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const coverImageSrc = resolvePublicMediaUrl(profile.cover_image_url);
  const coverImageIsPublicMedia = isPublicMediaUrl(profile.cover_image_url);
  const [failedCoverImageUrl, setFailedCoverImageUrl] = useState<string | null>(null);
  const coverImageFailed = Boolean(coverImageSrc && failedCoverImageUrl === coverImageSrc);

  if (!coverImageSrc || coverImageFailed) {
    return (
      <div className="relative h-[118px] overflow-hidden bg-gradient-to-br from-[#2F8DEB] to-[#60A5FA] sm:h-[132px] lg:h-[160px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.34),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(191,219,254,0.48),transparent_34%),linear-gradient(135deg,#EAF5FF,#D9ECFF_52%,#F8FAFC)] opacity-100" />
      </div>
    );
  }

  return (
    <div className="relative h-[118px] overflow-hidden bg-black sm:h-[132px] lg:h-[160px]">
      <Image
        alt={`Imagem de capa de ${profile.name}`}
        className="h-full w-full object-cover object-center"
        fill
        priority={false}
        sizes="(min-width: 768px) 720px, 100vw"
        src={coverImageSrc}
        unoptimized={coverImageIsPublicMedia}
        onError={() => setFailedCoverImageUrl(coverImageSrc)}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.62)_0%,rgba(15,23,42,0.24)_30%,rgba(15,23,42,0.08)_58%,rgba(15,23,42,0.42)_100%)]" />
    </div>
  );
};

const ProfileHero = ({
  canFavorite,
  canEditProfile,
  favoritePending,
  onBack,
  onEditProfile,
  onShareProfile,
  onToggleFavorite,
  profile,
}: {
  canFavorite: boolean;
  canEditProfile: boolean;
  favoritePending: boolean;
  onBack: () => void;
  onEditProfile: () => void;
  onShareProfile: () => void;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const bioFallback = "Perfil profissional publicado na Lectum com dados públicos persistidos.";
  const displayName = getHonorificName(profile);
  const headline = profile.headline || profile.bio || bioFallback;
  const { last, prefix } = splitNameWithBadge(displayName);
  const benefitTags = buildBenefitTags(profile);
  const formattedCrp = formatCrpNumber(profile.crp);

  return (
    <section className="box-border bg-[#F6F8FB] pb-2" data-profile-hero="true">
      <div className="relative">
        <ProfileHeroMedia profile={profile} />

        <button
          aria-label="Voltar para a tela anterior"
          className="absolute top-4 left-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/88 text-[#0F172A] shadow-[0_10px_20px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:bg-white"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          aria-label="Compartilhar perfil"
          className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/88 text-[#0F172A] shadow-[0_10px_20px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:bg-white"
          onClick={onShareProfile}
          type="button"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>

        {canEditProfile ? (
          <button
            aria-label="Editar perfil"
            className="absolute top-4 right-16 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/88 text-[#0F172A] shadow-[0_10px_20px_rgba(15,23,42,0.18)] backdrop-blur-md transition hover:bg-white"
            onClick={onEditProfile}
            type="button"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <article
        className="relative mx-1.5 -mt-10 rounded-[22px] border border-[#E2E8F0] bg-white px-3.5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:mx-3 sm:px-5"
        data-profile-main-card="true"
      >
        <button
          aria-label={
            !canFavorite
              ? "Favoritos disponíveis apenas para usuários autenticados"
              : profile.favorited
                ? `Remover ${profile.name} dos favoritos`
                : `Favoritar ${profile.name}`
          }
          aria-pressed={profile.favorited}
          className={cn(
            "absolute -top-4 right-4 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E2E8F0] text-[#94A3B8] shadow-[0_10px_22px_rgba(15,23,42,0.12)] transition disabled:cursor-not-allowed disabled:opacity-60",
            profile.favorited
              ? "border-[#fecaca] bg-[#fef2f2] text-[#ef4444]"
              : "bg-white/95 text-[#64748B] hover:bg-[#f8fafc]",
          )}
          disabled={favoritePending || !canFavorite}
          onClick={onToggleFavorite}
          title={
            !canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined
          }
          type="button"
        >
          <Heart
            className={cn(
              "h-4.5 w-4.5",
              profile.favorited ? "fill-[#ef4444] text-[#ef4444]" : "fill-none",
            )}
          />
        </button>

        <div className="flex items-start gap-2.5 sm:gap-3" data-profile-hero-summary="true">
          <ProfileAvatar profile={profile} />

          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-[clamp(23px,6.4vw,25px)] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#0F172A] sm:text-[27px]">
              <span className="inline-flex min-w-0 flex-wrap items-start gap-1.5">
                {prefix ? <span className="break-words">{`${prefix} `}</span> : null}
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  <span>{last || "Profissional"}</span>
                  {profile.verified ? (
                    <VerifiedBadgeIcon aria-hidden="true" className="h-[17px] w-[17px]" />
                  ) : null}
                </span>
              </span>
            </h1>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium leading-[1.35] text-[#475569] sm:text-[12.5px]">
              {getPsychologistTitle(profile.gender)}
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#94A3B8]" />
              <span>{formattedCrp ? `CRP ${formattedCrp}` : "CRP não informado"}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#94A3B8]" />
              <span className="inline-flex items-center gap-0.5 text-[#B45309]">
                <Star className="h-3 w-3 fill-[#FBBF24] text-[#FBBF24]" aria-hidden="true" />
                {formatHeroRating(profile.rating_avg)}
              </span>
            </p>

            {profile.available_today ? (
              <span
                className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#16A34A]"
                data-availability-badge="true"
              >
                <span
                  className="h-2 w-2 rounded-full bg-[#16A34A] motion-safe:animate-pulse"
                  aria-hidden="true"
                />
                Disponível hoje
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-3.5 whitespace-pre-line text-[13px] leading-[1.6] text-[#334155] sm:text-[13.5px]">
          {headline.trim()}
        </p>

        {benefitTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5" data-profile-benefit-tags="true">
            {benefitTags.map((tag) => {
              const Icon = tag.icon;

              return (
                <span
                  className="inline-flex h-6 items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[9px] font-medium text-[#475569]"
                  key={tag.label}
                >
                  <Icon className="h-3 w-3 text-[#2F8DEB]" aria-hidden="true" />
                  {tag.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
};

const ProfileTabs = ({
  activeTab,
  onTabChange,
  profile,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const stickyName = getHonorificName(profile) || profile.name || "Profissional";
  const stickyContainerRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStickyState = () => {
      const top =
        stickyContainerRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const nextIsStuck = top <= 1;

      setIsStuck((current) => (current === nextIsStuck ? current : nextIsStuck));
    };

    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);

    return () => {
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, []);

  return (
    <div
      className={cn(
        "sticky z-20 px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-200 sm:px-4",
        isStuck
          ? "border-b border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.72)] shadow-[0_8px_22px_rgba(15,23,42,0.05)] backdrop-blur-[12px]"
          : "border-b border-transparent bg-transparent shadow-none",
      )}
      data-profile-sticky-navigation="true"
      ref={stickyContainerRef}
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div className={cn("mx-auto grid w-full max-w-[430px] lg:max-w-[760px]", isStuck && "gap-2")}>
        {isStuck ? (
          <div className="flex min-w-0 items-center gap-1.5" data-profile-sticky-name="true">
            <span className="min-w-0 truncate text-[13px] font-bold leading-[1.25] tracking-[-0.01em] text-[#0F172A]">
              {stickyName}
            </span>
            {profile.verified ? (
              <VerifiedBadgeIcon
                aria-label="Perfil verificado"
                className="h-[14px] w-[14px] shrink-0"
              />
            ) : null}
          </div>
        ) : null}

        <nav
          aria-label="Seções do perfil profissional"
          className="grid grid-cols-3 rounded-full border border-[rgba(226,232,240,0.78)] bg-[rgba(255,255,255,0.48)] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.055)] backdrop-blur-[14px]"
          data-profile-segmented-navigation="true"
        >
          {tabs.map((tab) => {
            const active = tab.value === activeTab;

            return (
              <button
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 min-w-0 items-center justify-center rounded-full px-2.5 text-[11px] font-semibold leading-none transition",
                  active
                    ? "bg-[rgba(255,255,255,0.92)] text-[#2F8DEB] shadow-[0_5px_14px_rgba(15,23,42,0.08)] ring-1 ring-[#BFDBFE]/70"
                    : "bg-transparent text-[#475569] hover:bg-white/45 hover:text-[#0F172A]",
                )}
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const PresentationVideo = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const [playing, setPlaying] = useState(false);
  const videoSrc = resolvePublicMediaUrl(profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.video_cover_url);
  const videoCoverIsPublicMedia = isPublicMediaUrl(profile.video_cover_url);

  if (!videoSrc) return null;

  return (
    <div className="mt-3 grid gap-2.5">
      <article
        className="box-border relative mx-auto w-full max-w-[214px] overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-[#e2e8f0] shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:max-w-[240px]"
        data-presentation-video="true"
      >
        <div className="relative aspect-[9/16] w-full">
          {playing ? (
            <div className="relative h-full w-full">
              {/* biome-ignore lint/a11y/useMediaCaption: Vídeos enviados pelos profissionais não possuem legenda no momento do cadastro. */}
              <video
                aria-label={`Vídeo de apresentação de ${profile.name}`}
                autoPlay
                className="h-full w-full bg-black object-cover"
                controls
                onEnded={() => setPlaying(false)}
                playsInline
                poster={videoCoverSrc || undefined}
                preload="metadata"
                src={videoSrc}
              >
                Seu navegador não suporta a reprodução de vídeo.
              </video>
              <button
                aria-label="Fechar vídeo"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/75 text-[#0F172A] shadow-sm transition hover:bg-white/90"
                onClick={() => setPlaying(false)}
                type="button"
              >
                <span aria-hidden="true" className="text-sm font-bold leading-none">
                  ×
                </span>
              </button>
            </div>
          ) : (
            <div className="relative h-full w-full">
              {videoCoverSrc ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover"
                  fill
                  sizes="(min-width: 768px) 240px, 214px"
                  src={videoCoverSrc}
                  unoptimized={videoCoverIsPublicMedia}
                />
              ) : (
                <video
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  preload="auto"
                  src={videoSrc}
                  tabIndex={-1}
                />
              )}
              <button
                aria-label={`Reproduzir vídeo de apresentação de ${profile.name}`}
                className="absolute inset-0 grid place-items-center text-white transition hover:bg-foreground/10"
                onClick={() => setPlaying(true)}
                type="button"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/75 text-[#0F172A] shadow-sm">
                  <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </div>
          )}
        </div>
      </article>

      <article className="box-border rounded-[10px] border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-2 text-[9px] text-[#0F172A]">
        <p className="font-semibold">Quer falar com o profissional?</p>
        <p className="mt-1 leading-[1.35] text-[#1E293B]">
          O atendimento e os valores são alinhados diretamente no WhatsApp.
          <br />
          Toque no botão verde para iniciar a conversa.
        </p>
      </article>
    </div>
  );
};

const ExpandableAboutText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const content = text.trim();

  const recalculate = useCallback(() => {
    const measure = measureRef.current;

    if (!measure || typeof window === "undefined") return;

    const computedLineHeight = parseFloat(getComputedStyle(measure).lineHeight);
    const maxLinesHeight = (Number.isFinite(computedLineHeight) ? computedLineHeight : 0) * 3;
    const nextCanExpand = maxLinesHeight > 0 ? measure.scrollHeight > maxLinesHeight + 2 : false;

    setCanExpand((current) => (current === nextCanExpand ? current : nextCanExpand));

    if (!nextCanExpand) {
      setExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(recalculate);
    window.addEventListener("resize", recalculate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", recalculate);
    };
  }, [recalculate]);

  return (
    <div className="relative mt-2.5 grid gap-1.5">
      <p
        className={cn(
          "whitespace-pre-line text-[13px] leading-[1.6] text-[#475569] sm:text-[13.5px]",
          !expanded && "line-clamp-3",
        )}
      >
        {content}
      </p>
      <p
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 h-auto w-full overflow-hidden whitespace-pre-line text-[13px] leading-[1.6] text-[#475569] opacity-0 sm:text-[13.5px]"
        ref={measureRef}
      >
        {content}
      </p>
      {canExpand ? (
        <button
          className="w-fit text-[12px] font-semibold text-[#2F8DEB] transition hover:text-[#1d4ed8]"
          onClick={() => setExpanded((previous) => !previous)}
          type="button"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      ) : null}
    </div>
  );
};

const FormationSection = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const formations = profile.academic_formations ?? [];
  const hasAnyFormation = formations.length > 0;

  return (
    <ProfileSectionCard title="Formação & Títulos">
      {hasAnyFormation ? (
        <div className="mt-2.5 grid gap-2">
          {formations.map((formation, index) => {
            const institutionLine = formatList(
              [formation.institution || "", formation.graduation_year || ""],
              "Instituição e data não informadas",
            );

            return (
              <article
                className="box-border flex items-start gap-2.5 rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2"
                key={`${formation.title || "formacao"}-${formation.institution || index}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#2F8DEB] shadow-[0_4px_12px_rgba(47,141,235,0.08)]">
                  <GraduationCap className="h-[15px] w-[15px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-[1.28] text-[#0F172A]">
                    {formation.title || "Título não informado"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-[1.35] text-[#64748B]">
                    {institutionLine}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[12px] leading-[1.55] text-[#64748B]">
          Este profissional ainda não cadastrou formação e títulos.
        </p>
      )}
    </ProfileSectionCard>
  );
};

const ReviewPreviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className="mt-3 box-border rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[11px] font-extrabold text-[#2F8DEB]">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-[#0F172A]">{review.author.name}</p>
              <p className="text-[11px] text-[#64748B]">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          <p className="mt-2 line-clamp-3 text-[12px] leading-[1.55] text-[#64748B]">
            &ldquo;{review.comment || "Avaliação publicada sem comentário textual."}&rdquo;
          </p>
        </div>
      </div>
    </article>
  );
};

const ReviewsPreviewSection = ({
  isError,
  isLoading,
  onViewAll,
  reviews,
  summary,
}: {
  isError: boolean;
  isLoading: boolean;
  onViewAll: () => void;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  const firstReview = reviews[0];
  const hasReviews = summary.rating_count > 0 || reviews.length > 0;

  return (
    <ProfileSectionCard title="Avaliações">
      {hasReviews ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-end gap-2">
              <p className="text-[26px] font-extrabold leading-none text-[#0F172A]">
                {formatRatingNumber(summary.rating_avg, summary.rating_count)}
              </p>
              <p className="pb-0.5 text-[12px] font-medium text-[#64748B]">
                {summary.rating_count} avaliações
              </p>
            </div>
            <div className="mt-1.5">
              <StarRating rating={summary.rating_avg / 100} />
            </div>
          </div>

          <button
            className="shrink-0 rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1.5 text-[10px] font-bold text-[#2F8DEB] transition hover:bg-[#EFF6FF]"
            onClick={onViewAll}
            type="button"
          >
            Ver todas
          </button>
        </div>
      ) : null}

      {isError ? (
        <p className="mt-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] leading-[1.4] text-[#991B1B]">
          Não foi possível carregar a prévia de avaliações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando avaliações" /> : null}

      {!isLoading && !isError && firstReview ? <ReviewPreviewCard review={firstReview} /> : null}

      {!isLoading && !isError && !firstReview ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12px] leading-[1.55] text-[#64748B]">
            Este profissional ainda não possui avaliações.
          </p>
        </div>
      ) : null}
    </ProfileSectionCard>
  );
};

const PostPreviewCard = ({ post }: { post: DirectoryPsychologistProfilePost }) => {
  const previewImage = (post as { media_url?: string | null }).media_url;

  return (
    <article className="mt-3 box-border rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="flex items-start justify-between gap-3 text-[11px] font-semibold text-[#64748B]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
          <span className="truncate">{post.community.name}</span>
        </span>
        <span className="shrink-0">{formatCompactDate(post.created_at)}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[13px] font-extrabold leading-[1.35] text-[#0F172A]">
            {post.title}
          </h3>
          <p className="mt-1.5 line-clamp-3 text-[11px] leading-[1.45] text-[#64748B]">
            {post.content}
          </p>
        </div>

        {previewImage ? (
          <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-[10px] bg-[#E2E8F0]">
            <Image
              alt="Prévia da publicação"
              className="object-cover"
              fill
              sizes="56px"
              src={previewImage}
              unoptimized={isPublicMediaUrl(previewImage)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] pt-3 text-[11px] font-semibold text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          {post.upvotes_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          {post.replies_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          {post.saves_count}
        </span>
      </div>
    </article>
  );
};

const PostsPreviewSection = ({
  isError,
  isLoading,
  onViewAll,
  posts,
  total,
}: {
  isError: boolean;
  isLoading: boolean;
  onViewAll: () => void;
  posts: DirectoryPsychologistProfilePost[];
  total: number;
}) => {
  const firstPost = posts[0];

  return (
    <ProfileSectionCard title="Publicações">
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12px] leading-[1.55] text-[#64748B]">
          {total > 0
            ? `${total} publicação${total === 1 ? "" : "ões"} deste profissional.`
            : "Este profissional ainda não possui publicações públicas."}
        </p>

        {total > 0 ? (
          <button
            className="shrink-0 rounded-full border border-[#DBEAFE] bg-[#F8FAFC] px-3 py-1.5 text-[10px] font-bold text-[#2F8DEB] transition hover:bg-[#EFF6FF]"
            onClick={onViewAll}
            type="button"
          >
            Ver todas
          </button>
        ) : null}
      </div>

      {isError ? (
        <p className="mt-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] leading-[1.4] text-[#991B1B]">
          Não foi possível carregar a prévia de publicações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando publicações" /> : null}

      {!isLoading && !isError && firstPost ? <PostPreviewCard post={firstPost} /> : null}
    </ProfileSectionCard>
  );
};

const AboutTab = ({
  onTabChange,
  postsPreview,
  profile,
  reviewsPreview,
}: {
  onTabChange: (tab: ProfileTab) => void;
  postsPreview: {
    isError: boolean;
    isLoading: boolean;
    posts: DirectoryPsychologistProfilePost[];
    total: number;
  };
  profile: DirectoryPsychologistProfile;
  reviewsPreview: {
    isError: boolean;
    isLoading: boolean;
    reviews: DirectoryPsychologistProfileReview[];
    summary: DirectoryReviewSummary;
  };
}) => {
  const bioText = profile.bio || "Este profissional ainda não informou uma biografia pública.";
  const serviceText = formatList(
    profile.services.map((item) => item.name),
    "Serviços não informados.",
  );
  const approachText = formatList(
    profile.approaches.map((item) => item.name),
    "Abordagens não informadas.",
  );
  const targetText = formatList(
    (profile.target_audience ?? []).map(translateTargetAudience),
    "Público atendido não informado.",
  );
  const languageText = formatList(
    profile.languages.map(translateLanguage),
    "Idiomas não informados.",
  );
  const modalityText = formatList([formatAttendanceLabel(profile)], "Modalidade não informada.");

  return (
    <div className="grid gap-3 bg-[#F6F8FB] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
      <ProfileSectionCard title="Sobre">
        <ExpandableAboutText text={bioText} />
        <PresentationVideo profile={profile} />
      </ProfileSectionCard>

      <ProfileSectionCard title="Especialidades">
        <ProfileChipList
          emptyMessage="Este profissional ainda não informou especialidades públicas."
          items={profile.specialties}
        />
      </ProfileSectionCard>

      <ReviewsPreviewSection
        isError={reviewsPreview.isError}
        isLoading={reviewsPreview.isLoading}
        onViewAll={() => onTabChange("avaliacoes")}
        reviews={reviewsPreview.reviews}
        summary={reviewsPreview.summary}
      />

      <ProfileSectionCard title="Atendimento" className="mb-0">
        <div className="mt-2.5 grid gap-2">
          <ProfileInfoCard compact icon={MapPin} label="Modalidade" value={modalityText} />
          <ProfileInfoCard
            compact
            icon={MessageSquareText}
            label="Abordagens"
            value={approachText}
          />
          <ProfileInfoCard compact icon={BriefcaseBusiness} label="Serviços" value={serviceText} />
          <ProfileInfoCard compact icon={UsersRound} label="Público atendido" value={targetText} />
          <ProfileInfoCard compact icon={Languages} label="Idiomas" value={languageText} />
        </div>
      </ProfileSectionCard>

      <FormationSection profile={profile} />

      <PostsPreviewSection
        isError={postsPreview.isError}
        isLoading={postsPreview.isLoading}
        onViewAll={() => onTabChange("publicacoes")}
        posts={postsPreview.posts}
        total={postsPreview.total}
      />
    </div>
  );
};

const PostCard = ({ post }: { post: DirectoryPsychologistProfilePost }) => {
  const previewImage = (post as { media_url?: string | null }).media_url;

  return (
    <article className="box-border rounded-[8px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-start justify-between gap-3 text-[11px] font-semibold text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
          <span>
            Postado em <strong className="text-[#0F172A]">{post.community.name}</strong>
          </span>
        </span>
        <span>{formatCompactDate(post.created_at)}</span>
      </div>

      {previewImage ? (
        <div className="relative mt-3 h-40 w-full overflow-hidden rounded-[8px] bg-[#e2e8f0]">
          <Image
            alt="Prévia da publicação"
            className="object-cover"
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            src={previewImage}
            unoptimized={isPublicMediaUrl(previewImage)}
          />
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90">
              <Play className="h-4 w-4 fill-[#2F8DEB] text-[#2F8DEB]" aria-hidden="true" />
            </span>
          </span>
        </div>
      ) : null}

      <h2 className="mt-3 text-[13px] font-extrabold leading-[1.35] text-[#0F172A]">
        {post.title}
      </h2>
      <p className="mt-2 line-clamp-3 text-[12px] leading-[1.55] text-[#64748B]">{post.content}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] pt-3 text-[11px] font-semibold text-[#64748B]">
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {post.upvotes_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          {post.replies_count}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          {post.saves_count}
        </span>
      </div>
    </article>
  );
};

const PostsTab = ({
  currentPage,
  error,
  isError,
  isFetching,
  isLoading,
  onPageChange,
  pages,
  posts,
  total,
}: {
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  pages: number;
  posts: DirectoryPsychologistProfilePost[];
  total: number;
}) => {
  return (
    <div className="grid gap-4 bg-[#F6F8FB] pb-1 pt-3 sm:pt-4 px-3 sm:px-4">
      <div className="rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-3">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#0F172A]">
          Publicações &gt;
        </p>
        <p className="mt-1 text-base font-extrabold text-[#0F172A]">{total}</p>
      </div>

      {isError ? (
        <InlineAlert title="Não foi possível carregar publicações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as publicações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center rounded-[8px] border border-[#E2E8F0] bg-white box-border">
          <LoadingState label="Carregando publicações" />
        </div>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <EmptyState
          description="Este profissional ainda não possui publicações persistidas e publicadas."
          icon={FileText}
          title="Nenhuma publicação pública"
        />
      ) : null}

      {!isLoading && !isError && posts.length > 0 ? (
        <div className="grid gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}

      <Pagination
        currentPage={currentPage}
        disabled={isFetching}
        onPageChange={onPageChange}
        pages={pages}
      />
    </div>
  );
};

const ReviewSummaryCard = ({ summary }: { summary: DirectoryReviewSummary }) => {
  if (summary.rating_count <= 0) {
    return (
      <article className="rounded-[8px] bg-transparent">
        <p className="text-[12px] leading-[1.55] text-[#64748B]">
          Este profissional ainda não possui avaliações.
        </p>
      </article>
    );
  }

  const max = Math.max(1, summary.rating_count);

  return (
    <article className="grid gap-3 rounded-[8px] border border-[#E2E8F0] bg-white p-3 box-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[28px] font-extrabold leading-none text-[#0F172A]">
            {formatRatingNumber(summary.rating_avg, summary.rating_count)}
          </p>
          <div className="mt-1.5">
            <StarRating rating={summary.rating_avg / 100} />
          </div>
          <p className="mt-1.5 text-[11px] text-[#64748B]">{summary.rating_count} avaliações</p>
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0;
          const percent = Math.round((count / max) * 100);

          return (
            <div className="grid grid-cols-[18px_1fr_42px] items-center gap-2" key={rating}>
              <span className="text-[10px] font-semibold text-[#64748B]">{rating}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                <span
                  className="block h-full rounded-full bg-[#FACC15]"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-right text-[10px] font-semibold text-[#64748B]">
                {percent}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2F8DEB]" aria-hidden="true" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" aria-hidden="true" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" aria-hidden="true" />
      </div>
    </article>
  );
};

const ReviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className="box-border rounded-[8px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[11px] font-extrabold text-[#2F8DEB]">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[12px] font-extrabold text-[#0F172A]">{review.author.name}</h2>
              <p className="text-[11px] text-[#64748B]">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {review.comment ? (
            <p className="mt-3 text-[12px] leading-[1.55] text-[#64748B]">
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : (
            <p className="mt-3 text-[12px] leading-[1.55] text-[#64748B]">
              Avaliação publicada sem comentário textual.
            </p>
          )}
          {review.response ? (
            <div className="mt-3 border-l-2 border-[#2F8DEB] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2F8DEB]">
                Resposta do profissional
              </p>
              <p className="mt-1 text-[12px] leading-[1.55] text-[#0F172A]">
                &ldquo;{review.response}&rdquo;
              </p>
              {review.responded_at ? (
                <p className="mt-1 text-[10px] text-[#64748B]">
                  Respondido em {formatDate(review.responded_at)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const ReviewsTab = ({
  currentPage,
  error,
  isError,
  isFetching,
  isLoading,
  onPageChange,
  pages,
  reviews,
  summary,
}: {
  currentPage: number;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  pages: number;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  return (
    <div className="grid gap-4 bg-[#F6F8FB] pb-1 pt-3 sm:pt-4 px-3 sm:px-4">
      <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Avaliações &gt;
      </h2>
      <ReviewSummaryCard summary={summary} />

      {isError ? (
        <InlineAlert title="Não foi possível carregar avaliações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as avaliações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-[30vh] place-items-center rounded-[8px] border border-[#E2E8F0] bg-white box-border">
          <LoadingState label="Carregando avaliações" />
        </div>
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}

      {isFetching && !isLoading ? <LoadingState label="Atualizando avaliações" /> : null}

      <Pagination
        currentPage={currentPage}
        disabled={isFetching}
        onPageChange={onPageChange}
        pages={pages}
      />
    </div>
  );
};

const WhatsAppCta = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  if (!profile.whatsapp_url) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-white px-3 pb-2 pt-2 shadow-[0_-6px_18px_rgba(15,23,42,0.12)] sm:px-4"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[760px]">
        <Button
          asChild
          className="h-11 w-full rounded-[8px] bg-[#22C55E] text-[13px] font-bold text-white hover:bg-[#22C55E]/90"
        >
          <a href={profile.whatsapp_url} rel="noreferrer" target="_blank">
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
            Chamar no WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
};

export const PsychologistProfileLogic = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [shareFeedback, setShareFeedback] = useState(false);
  const currentUser = useAppSelector((state) => state.user);
  const canFavoritePsychologists = Boolean(currentUser?.id);
  const id = params.id;

  const urlParams = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const activeTab = useMemo(() => normalizeTab(urlParams.get("tab")), [urlParams]);
  const postsPage = useMemo(() => getPageFromParams(urlParams, "postsPage"), [urlParams]);
  const reviewsPage = useMemo(() => getPageFromParams(urlParams, "reviewsPage"), [urlParams]);
  const postsQuery = useMemo(
    () => ({ page: activeTab === "geral" ? 1 : postsPage, limit: PAGE_LIMIT }),
    [activeTab, postsPage],
  );
  const reviewsQuery = useMemo(
    () => ({ page: activeTab === "geral" ? 1 : reviewsPage, limit: PAGE_LIMIT }),
    [activeTab, reviewsPage],
  );

  const profileQuery = useDirectoryPsychologist(id);
  const profile = profileQuery.data;
  const posts = useDirectoryPsychologistPosts(
    id,
    postsQuery,
    (activeTab === "publicacoes" || activeTab === "geral") && Boolean(profile),
  );
  const reviews = useDirectoryPsychologistReviews(
    id,
    reviewsQuery,
    (activeTab === "avaliacoes" || activeTab === "geral") && Boolean(profile),
  );
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });

  const navigateWithParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParamsString);
      mutate(next);
      const queryString = next.toString();

      router.replace(`/app/psychologist/${id}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [id, router, searchParamsString],
  );

  const setActiveTab = (tab: ProfileTab) => {
    navigateWithParams((next) => {
      if (tab === "geral") next.delete("tab");
      else next.set("tab", tab);
      next.delete("postsPage");
      next.delete("reviewsPage");
    });
  };

  const setPostsPage = (page: number) => {
    navigateWithParams((next) => {
      next.set("tab", "publicacoes");
      if (page > 1) next.set("postsPage", String(page));
      else next.delete("postsPage");
    });
  };

  const setReviewsPage = (page: number) => {
    navigateWithParams((next) => {
      next.set("tab", "avaliacoes");
      if (page > 1) next.set("reviewsPage", String(page));
      else next.delete("reviewsPage");
    });
  };

  const toggleFavorite = () => {
    if (!canFavoritePsychologists) return;
    if (!profile) return;

    if (profile.favorited) {
      unfavoritePsychologist.mutate(profile.id);
      return;
    }

    favoritePsychologist.mutate(profile.id);
  };

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

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app/psychologists");
  };

  const goToProfileEdit = () => {
    router.push("/app/professional/profile/setup");
  };

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const showInitialLoading = profileQuery.isLoading && !profile;
  const profileErrorMessage = profileQuery.isError
    ? resolveErrorMessage(profileQuery.error, "Não foi possível carregar o perfil profissional.")
    : null;
  const canEditProfile =
    currentUser?.role === "psicologo" && Boolean(profile?.id) && currentUser.id === profile?.id;

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
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
      showNavigation
    >
      <div className="-mx-5 -mt-6 overflow-x-hidden">
        <section className="mx-auto grid w-screen max-w-[430px] bg-[#F6F8FB] sm:max-w-[430px] lg:max-w-[760px]">
          <div className="grid gap-0 pb-28">
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

            {!showInitialLoading && profileErrorMessage ? (
              <div className="mx-3 grid gap-4 bg-background px-0 py-8">
                <InlineAlert title="Perfil indisponível" variant="error">
                  {profileErrorMessage}
                </InlineAlert>
                <Button asChild variant="outline">
                  <Link href="/app/psychologists">Voltar para a busca</Link>
                </Button>
              </div>
            ) : null}

            {!showInitialLoading && !profileErrorMessage && profile ? (
              <>
                <ProfileHero
                  canFavorite={canFavoritePsychologists}
                  canEditProfile={canEditProfile}
                  favoritePending={favoritePendingId === profile.id}
                  onBack={goBack}
                  onEditProfile={goToProfileEdit}
                  onShareProfile={shareProfile}
                  onToggleFavorite={toggleFavorite}
                  profile={profile}
                />

                <div className="grid gap-0">
                  <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} profile={profile} />
                  {activeTab === "geral" ? (
                    <AboutTab
                      onTabChange={setActiveTab}
                      postsPreview={{
                        isError: posts.isError,
                        isLoading: posts.isLoading,
                        posts: posts.data?.data ?? [],
                        total: posts.data?.count ?? 0,
                      }}
                      profile={profile}
                      reviewsPreview={{
                        isError: reviews.isError,
                        isLoading: reviews.isLoading,
                        reviews: reviews.data?.data ?? [],
                        summary: reviews.data?.summary ?? emptySummary,
                      }}
                    />
                  ) : null}
                  {activeTab === "publicacoes" ? (
                    <PostsTab
                      currentPage={postsPage}
                      error={posts.error}
                      isError={posts.isError}
                      isFetching={posts.isFetching}
                      isLoading={posts.isLoading}
                      onPageChange={setPostsPage}
                      pages={posts.data?.pages ?? 0}
                      posts={posts.data?.data ?? []}
                      total={posts.data?.count ?? 0}
                    />
                  ) : null}
                  {activeTab === "avaliacoes" ? (
                    <ReviewsTab
                      currentPage={reviewsPage}
                      error={reviews.error}
                      isError={reviews.isError}
                      isFetching={reviews.isFetching}
                      isLoading={reviews.isLoading}
                      onPageChange={setReviewsPage}
                      pages={reviews.data?.pages ?? 0}
                      reviews={reviews.data?.data ?? []}
                      summary={reviews.data?.summary ?? emptySummary}
                    />
                  ) : null}
                </div>

                <WhatsAppCta profile={profile} />
              </>
            ) : null}
          </div>
        </section>
      </div>
    </PrivateTemplate>
  );
};
