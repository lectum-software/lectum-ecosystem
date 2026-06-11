"use client";

import {
  ArrowLeft,
  BadgePercent,
  Bookmark,
  Brain,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDirectoryPsychologist,
  useDirectoryPsychologistPosts,
  useDirectoryPsychologistReviews,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
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
const PROFILE_TABS = ["sobre", "publicacoes", "avaliacoes"] as const;

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
  { label: "Sobre", value: "sobre" },
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
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "sobre";
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

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0 (0)";

  return `${(ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} (${ratingCount})`;
};

const formatHeroRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0 (0)";

  return formatRating(ratingAvg, ratingCount);
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
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <article className="box-border rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3">
    <div className="flex min-h-0 items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[#2F8DEB]">
        <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[7px] font-medium uppercase leading-none tracking-[0.08em] text-[#94A3B8]">
          {label}
        </p>
        <p className="mt-0.5 line-clamp-4 break-words text-[10px] font-semibold leading-[1.35] text-[#0F172A]">
          {value}
        </p>
      </div>
    </div>
  </article>
);

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
      className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[12px] border-[3px] border-white bg-surface-muted text-2xl font-extrabold text-primary"
      data-profile-avatar="true"
    >
      {avatarSrc ? (
        <Image
          alt={profile.name}
          className="object-cover"
          fill
          priority
          sizes="80px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(profile.name)
      )}
    </div>
  );
};

const ProfileHero = ({
  canFavorite,
  favoritePending,
  onBack,
  onShareProfile,
  onToggleFavorite,
  profile,
}: {
  canFavorite: boolean;
  favoritePending: boolean;
  onBack: () => void;
  onShareProfile: () => void;
  onToggleFavorite: () => void;
  profile: DirectoryPsychologistProfile;
}) => {
  const headline = profile.headline || profile.bio;
  const displayName = getHonorificName(profile);
  const benefitTags = buildBenefitTags(profile);
  const formattedCrp = formatCrpNumber(profile.crp);

  return (
    <section className="box-border bg-[#F6F8FB]" data-profile-hero="true">
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[#2F8DEB] to-[#60A5FA]">
        <button
          aria-label="Voltar para a tela anterior"
          className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/75 text-[#0F172A] transition hover:bg-white/90 sm:left-4 sm:top-4"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          aria-label="Compartilhar perfil"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/75 text-[#0F172A] transition hover:bg-white/90 sm:right-4 sm:top-4"
          onClick={onShareProfile}
          type="button"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-3 mt-3 sm:mx-4">
        <article className="box-border rounded-[12px] border border-[#E2E8F0] bg-white px-3 py-3">
          <div className="relative -mt-7 flex items-start gap-3">
            <ProfileAvatar profile={profile} />

            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] font-extrabold leading-[1.2] text-[#0F172A] sm:text-[17px]">
                <span className="line-clamp-2 block min-w-0 break-words">
                  <span>{displayName}</span>
                  {profile.verified ? (
                    <VerifiedBadgeIcon
                      aria-hidden="true"
                      className="ml-1 inline h-[16px] w-[16px]"
                    />
                  ) : null}
                </span>
              </h1>

              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] leading-[1.25] text-[#64748B] sm:text-[11px]">
                {getPsychologistTitle(profile.gender)}
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#94A3B8]" />
                <span>{formattedCrp ? `CRP ${formattedCrp}` : "CRP não informado"}</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#94A3B8]" />
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-[#FACC15] text-[#FACC15]" aria-hidden="true" />
                  {formatHeroRating(profile.rating_avg, profile.rating_count)}
                </span>
              </p>

              {profile.available_today ? (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#16A34A]"
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
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#E2E8F0] text-[#94A3B8] transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-8",
                profile.favorited && "text-red-500",
              )}
              disabled={favoritePending || !canFavorite}
              onClick={onToggleFavorite}
              title={
                !canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined
              }
              type="button"
            >
              <Heart className={cn("h-4 w-4", profile.favorited && "fill-current")} />
            </button>
          </div>

          {headline ? (
            <p className="mt-2 line-clamp-2 text-[11px] leading-[1.35] text-[#64748B] sm:text-[12px]">
              {headline}
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-[1.35] text-[#64748B] sm:text-[12px]">
              Perfil profissional publicado na Lectum com dados públicos persistidos.
            </p>
          )}

          {benefitTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5" data-profile-benefit-tags="true">
              {benefitTags.map((tag) => {
                const Icon = tag.icon;

                return (
                  <span
                    className="inline-flex h-6 items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[9px] font-medium text-[#334155]"
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
      </div>
    </section>
  );
};

const ProfileTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) => {
  return (
    <nav
      aria-label="Seções do perfil profissional"
      className="grid w-full grid-cols-3 border-b border-[#E5E7EB] bg-white text-[11px]"
    >
      {tabs.map((tab) => {
        const active = tab.value === activeTab;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center gap-1 border-b-2 px-1.5 font-medium transition",
              active
                ? "border-[#2F8DEB] text-[#2F8DEB]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]",
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
  );
};

const PresentationVideo = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const [playing, setPlaying] = useState(false);
  const videoSrc = resolvePublicMediaUrl(profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.video_cover_url);
  const videoCoverIsPublicMedia = isPublicMediaUrl(profile.video_cover_url);

  if (!videoSrc) return null;

  return (
    <div
      className="box-border relative h-[300px] overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-[#e2e8f0]"
      data-presentation-video="true"
    >
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
              sizes="(min-width: 768px) 720px, calc(100vw - 32px)"
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
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/65 text-white shadow-sm">
              <Play className="ml-1 h-5 w-5 fill-current" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

const ExpandableBio = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = textRef.current;
      setCanExpand(Boolean(element && element.scrollHeight > element.clientHeight + 2));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="grid gap-2">
      <p
        className={cn("text-[11px] leading-[1.45] text-[#64748B]", !expanded && "line-clamp-4")}
        ref={textRef}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          className="w-fit text-[11px] font-semibold text-[#2F8DEB] transition hover:text-[#1d4ed8]"
          onClick={() => setExpanded((current) => !current)}
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

  return (
    <section className="grid gap-3 px-3 pb-3 sm:px-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
        Formação & Títulos
      </h2>

      {formations.length > 0 ? (
        <div className="grid gap-3">
          {formations.map((formation, index) => {
            const institutionLine = formatList(
              [formation.institution || "", formation.graduation_year || ""],
              "Instituição e data não informadas",
            );

            return (
              <article
                className="box-border flex items-start gap-3 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3"
                key={`${formation.title || "formacao"}-${formation.institution || index}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-[#2F8DEB]">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold leading-[1.3] text-[#0F172A]">
                    {formation.title || "Título não informado"}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-[1.35] text-[#64748B]">
                    {institutionLine}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] leading-[1.45] text-[#64748B]">
          Nenhuma formação pública foi cadastrada para este perfil.
        </p>
      )}
    </section>
  );
};

const AboutTab = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const specialtyText = formatList(
    profile.specialties.map((item) => item.name),
    "Nenhuma especialidade pública cadastrada.",
  );
  const serviceText = formatList(
    profile.services.map((item) => item.name),
    "Nenhum serviço público cadastrado.",
  );
  const approachText = formatList(
    profile.approaches.map((item) => item.name),
    "Nenhuma abordagem pública cadastrada.",
  );
  const targetText = formatList(
    (profile.target_audience ?? []).map(translateTargetAudience),
    "Nenhum público atendido cadastrado.",
  );
  const languageText = formatList(
    profile.languages.map(translateLanguage),
    "Nenhum idioma cadastrado.",
  );

  const bioText =
    profile.bio ||
    "Este profissional ainda não informou uma biografia pública. Assim que houver dados persistidos, eles aparecerão aqui sem usar conteúdo fictício.";

  return (
    <div className="grid gap-3 bg-[#F6F8FB] pb-1 pt-3 sm:pt-4">
      <section className="mx-3 box-border rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-3 sm:px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          Sobre
        </h2>
        <ExpandableBio text={bioText} />
      </section>

      <div className="px-3 sm:px-4">
        <PresentationVideo profile={profile} />
      </div>

      <section className="grid gap-3 px-3 sm:px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          Especialidades
        </h2>
        <div className="grid gap-3">
          <ProfileInfoCard icon={Brain} label="Especialidades" value={specialtyText} />
          <ProfileInfoCard icon={MessageSquareText} label="Abordagens" value={approachText} />
        </div>
      </section>

      <section className="grid gap-3 px-3 pb-3 sm:px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
          Atendimento
        </h2>
        <div className="grid gap-3">
          <ProfileInfoCard
            icon={MapPin}
            label="Modalidades"
            value={formatAttendanceLabel(profile)}
          />
          <ProfileInfoCard icon={BriefcaseBusiness} label="Serviços" value={serviceText} />
          <ProfileInfoCard icon={UsersRound} label="Público atendido" value={targetText} />
          <ProfileInfoCard icon={Languages} label="Idiomas" value={languageText} />
        </div>
      </section>

      <FormationSection profile={profile} />
    </div>
  );
};

const PostCard = ({ post }: { post: DirectoryPsychologistProfilePost }) => {
  const previewImage = (post as { media_url?: string | null }).media_url;

  return (
    <article className="box-border rounded-[8px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-start justify-between gap-3 text-[10px] font-semibold text-[#64748B]">
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

      <h2 className="mt-3 text-[11px] font-extrabold leading-[1.35] text-[#0F172A]">
        {post.title}
      </h2>
      <p className="mt-2 text-[10px] leading-[1.4] text-[#64748B] line-clamp-3">{post.content}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] pt-3 text-[10px] font-semibold text-[#64748B]">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
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
              <h2 className="text-[11px] font-extrabold text-[#0F172A]">{review.author.name}</h2>
              <p className="text-[10px] text-[#64748B]">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {review.comment ? (
            <p className="mt-3 text-[11px] leading-[1.45] text-[#64748B]">
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : (
            <p className="mt-3 text-[11px] leading-[1.45] text-[#64748B]">
              Avaliação publicada sem comentário textual.
            </p>
          )}
          {review.response ? (
            <div className="mt-3 border-l-2 border-[#2F8DEB] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2F8DEB]">
                Resposta do profissional
              </p>
              <p className="mt-1 text-[11px] leading-[1.45] text-[#0F172A]">
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
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
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

      {!isLoading && !isError && reviews.length === 0 ? (
        <EmptyState
          description="Este profissional ainda não possui avaliações publicadas."
          icon={Star}
          title="Nenhuma avaliação pública"
        />
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
      <div className="mx-auto w-full max-w-[430px] space-y-2 lg:max-w-[760px]">
        <div className="rounded-[8px] border border-[#DBEAFE] bg-[#EFF6FF] box-border px-2.5 py-2.5">
          <p className="text-[10px] leading-[1.35] text-[#0F172A]">
            Para consultar agenda, valores e demais informações, chame o psicólogo no WhatsApp.
          </p>
        </div>

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
  const postsQuery = useMemo(() => ({ page: postsPage, limit: PAGE_LIMIT }), [postsPage]);
  const reviewsQuery = useMemo(() => ({ page: reviewsPage, limit: PAGE_LIMIT }), [reviewsPage]);

  const profileQuery = useDirectoryPsychologist(id);
  const profile = profileQuery.data;
  const posts = useDirectoryPsychologistPosts(
    id,
    postsQuery,
    activeTab === "publicacoes" && Boolean(profile),
  );
  const reviews = useDirectoryPsychologistReviews(
    id,
    reviewsQuery,
    activeTab === "avaliacoes" && Boolean(profile),
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
      if (tab === "sobre") next.delete("tab");
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

  const emptySummary = useMemo<DirectoryReviewSummary>(
    () => ({
      rating_avg: profile?.rating_avg ?? 0,
      rating_count: profile?.rating_count ?? 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }),
    [profile?.rating_avg, profile?.rating_count],
  );

  return (
    <PrivateTemplate allowAnonymous showNavigation={false}>
      <div className="-mt-6 -mx-5">
        <section className="mx-auto grid w-full max-w-[430px] bg-[#F6F8FB] sm:max-w-[430px] lg:max-w-[760px]">
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
                  favoritePending={favoritePendingId === profile.id}
                  onBack={goBack}
                  onShareProfile={shareProfile}
                  onToggleFavorite={toggleFavorite}
                  profile={profile}
                />

                <div className="grid gap-0">
                  <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
                  {activeTab === "sobre" ? <AboutTab profile={profile} /> : null}
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
