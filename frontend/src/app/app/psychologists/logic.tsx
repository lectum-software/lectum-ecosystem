"use client";

import {
  ArrowDown,
  ArrowUp,
  Award,
  BadgePercent,
  CalendarCheck,
  Check,
  HandHeart,
  Heart,
  type LucideIcon,
  Maximize2,
  Pause,
  Play,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
  type UIEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAccount } from "@/api/callers/account";
import {
  useDirectoryPsychologists,
  useDirectoryPsychologistVideoWatch,
} from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologist,
  DirectoryPsychologistsQuery,
  DirectoryPsychologistVideoWatchPayload,
} from "@/api/generator/types/directory";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { requestVideoFullscreen } from "@/lib/video-fullscreen";
import { playVideoWithSound } from "@/lib/video-playback";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { CITY_OPTIONS_BY_STATE } from "../professional/profile/setup/brazil-cities";
import {
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  MODALITY_OPTIONS,
  PUBLIC_TARGET_OPTIONS,
  RACE_COLOR_OPTIONS,
  RELIGION_OPTIONS,
  STATE_OPTIONS,
} from "../professional/profile/setup/options";
import {
  defaultPsychologistsFilterValues,
  type PsychologistsFilterForm,
  usePsychologistsFilterForm,
} from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const PAGE_LIMIT = 20;

const DEFAULT_NAV_BAR_HEIGHT = 72;
const PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR = "video[data-psychologists-background='true']";
const VIDEO_SINGLE_TAP_DELAY_MS = 260;
const VIDEO_ANALYTICS_HEARTBEAT_MS = 5000;
const FILTER_DIALOG_CLOSE_DELAY_MS = 300;
const PRESENTATION_VIDEO_RETENTION_BUCKETS = Array.from(
  { length: 20 },
  (_, index) => (index + 1) * 5,
);

const isPsychologistsScrollLockTarget = (target: EventTarget | null) => {
  const element =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  return Boolean(element?.closest("[data-psychologists-scroll-lock='true']"));
};
const VIDEO_LONG_PRESS_DELAY_MS = 520;
const VIDEO_PROGRESS_VISIBLE_NAV_BAR_HEIGHT = 64;
const VIDEO_IMMERSIVE_CONTROLS_BOTTOM_GAP = 14;
const VIDEO_IMMERSIVE_PROGRESS_CONTROLS_OFFSET = 74;
const VIDEO_PROGRESS_NAVBAR_OVERLAP_PX = 1;
const VIDEO_PROGRESS_TRACK_COLOR = "rgba(255,255,255,0.22)";
const VIDEO_PROGRESS_FILL_COLOR = "rgba(255,255,255,0.75)";
const DEFAULT_VIDEO_PLAYBACK_RATE = 1;
const IMMERSIVE_VIDEO_PLAYBACK_RATES = [1, 1.5, 2] as const;

type PsychologistsOnboardingTip = "mySearch" | "whatsapp";

type CoachMarkPosition = {
  arrowClassName: string;
  arrowLeft: number;
  bubbleStyle: CSSProperties;
  ringStyle: CSSProperties;
};

const PSYCHOLOGISTS_ONBOARDING_TARGET: Record<PsychologistsOnboardingTip, string> = {
  mySearch: "my-search",
  whatsapp: "whatsapp",
};

const PSYCHOLOGISTS_ONBOARDING_COPY: Record<
  PsychologistsOnboardingTip,
  { description: string; emphasis: string; title: string }
> = {
  mySearch: {
    description:
      "Toque em Minha Busca para ajustar filtros e encontrar psicólogos mais alinhados ao que você procura.",
    emphasis: "Minha Busca",
    title: "Refine sua busca",
  },
  whatsapp: {
    description:
      "Gostou de um perfil? Toque em Chamar no WhatsApp para iniciar a conversa e combinar os próximos passos.",
    emphasis: "Chamar no WhatsApp",
    title: "Fale direto com o psicólogo",
  },
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isVisibleCoachTarget = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;

  let current: HTMLElement | null = element;

  while (current) {
    const styles = window.getComputedStyle(current);

    if (styles.display === "none" || styles.visibility === "hidden") return false;
    if (Number(styles.opacity) === 0) return false;
    if (current === element && styles.pointerEvents === "none") return false;

    current = current.parentElement;
  }

  return true;
};

const findCoachTarget = (tip: PsychologistsOnboardingTip) => {
  if (typeof document === "undefined") return null;

  const targetName = PSYCHOLOGISTS_ONBOARDING_TARGET[tip];
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-psychologists-tip-target="${targetName}"]`),
  );

  return candidates.find(isVisibleCoachTarget) ?? null;
};

const getCoachMarkPosition = (
  tip: PsychologistsOnboardingTip,
  target: HTMLElement,
): CoachMarkPosition => {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleWidth = Math.min(320, Math.max(280, viewportWidth - 32));
  const estimatedBubbleHeight = tip === "mySearch" ? 118 : 128;
  const preferredTop =
    tip === "mySearch" ? rect.bottom + 14 : rect.top - estimatedBubbleHeight - 14;
  let top = preferredTop;

  if (top < 16) {
    top = rect.bottom + 14;
  }

  if (top + estimatedBubbleHeight > viewportHeight - 16) {
    top = Math.max(16, rect.top - estimatedBubbleHeight - 14);
  }

  const left = clampNumber(
    rect.left + rect.width / 2 - bubbleWidth / 2,
    16,
    Math.max(16, viewportWidth - bubbleWidth - 16),
  );
  const arrowLeft = clampNumber(rect.left + rect.width / 2 - left - 7, 24, bubbleWidth - 30);
  const isBelowTarget = top >= rect.bottom;

  return {
    arrowClassName: isBelowTarget ? "-top-1.5 border-t border-l" : "-bottom-1.5 border-r border-b",
    arrowLeft,
    bubbleStyle: {
      left,
      top,
      width: bubbleWidth,
    },
    ringStyle: {
      borderRadius: "9999px",
      height: rect.height + 16,
      left: rect.left - 8,
      top: rect.top - 8,
      width: rect.width + 16,
    },
  };
};

const PsychologistsCoachMark = ({
  onDismiss,
  tip,
}: {
  onDismiss: () => void;
  tip: PsychologistsOnboardingTip;
}) => {
  const [position, setPosition] = useState<CoachMarkPosition | null>(null);
  const copy = PSYCHOLOGISTS_ONBOARDING_COPY[tip];

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: number | null = null;

    const updatePosition = () => {
      const target = findCoachTarget(tip);

      setPosition(target ? getCoachMarkPosition(tip, target) : null);
    };

    updatePosition();
    timeout = window.setTimeout(updatePosition, 120);

    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }

      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [tip]);

  if (!position || typeof document === "undefined") return null;

  const [beforeEmphasis, afterEmphasis] = copy.description.split(copy.emphasis);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[135]" data-psychologists-coach-mark>
      <span
        aria-hidden="true"
        className="fixed border-2 border-primary/70 shadow-[0_0_0_9999px_rgb(15_23_42_/_42%)] ring-4 ring-primary/25 ring-offset-2 ring-offset-background/80 motion-safe:animate-pulse"
        style={position.ringStyle}
      />

      <section
        aria-live="polite"
        className="pointer-events-auto fixed rounded-[24px] border border-border bg-surface p-4 pr-11 text-left text-foreground shadow-[0_24px_70px_rgb(15_23_42_/_24%)] ring-1 ring-primary/10"
        style={position.bubbleStyle}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-3.5 w-3.5 rotate-45 border-border bg-surface",
            position.arrowClassName,
          )}
          style={{ left: position.arrowLeft }}
        />
        <button
          aria-label="Fechar dica"
          className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full text-subtle transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="grid gap-1.5">
          <h2 className="font-extrabold text-[0.98rem] leading-tight">{copy.title}</h2>
          <p className="text-sm leading-5 text-muted">
            {beforeEmphasis}
            <strong className="font-extrabold text-foreground">{copy.emphasis}</strong>
            {afterEmphasis}
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
};
const LONG_PRESS_MOVE_TOLERANCE_PX = 20;
const LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX = 32;
const LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX = 44;
const LONG_PRESS_VERTICAL_DOMINANCE_RATIO = 1.15;
const SWIPE_HINT_NUDGE_DURATION_MS = 760;

type VideoProgressState = {
  currentTime: number;
  duration: number;
};

type FeedVideoAnalyticsState = {
  completed: boolean;
  lastPosition: number;
  lastSentAt: number;
  maxPosition: number;
  milestones: {
    milestone_25: boolean;
    milestone_50: boolean;
    milestone_75: boolean;
    milestone_100: boolean;
  };
  profileId: string | null;
  replayCount: number;
  retentionBuckets: Set<number>;
  sessionKey: string | null;
  videoUrl: string | null;
  watchedSeconds: Set<number>;
};

const createEmptyFeedVideoAnalyticsState = (): FeedVideoAnalyticsState => ({
  completed: false,
  lastPosition: 0,
  lastSentAt: 0,
  maxPosition: 0,
  milestones: {
    milestone_25: false,
    milestone_50: false,
    milestone_75: false,
    milestone_100: false,
  },
  profileId: null,
  replayCount: 0,
  retentionBuckets: new Set(),
  sessionKey: null,
  videoUrl: null,
  watchedSeconds: new Set(),
});

const hashVideoSessionStorageKey = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const createVideoSessionKey = (profileId: string, videoUrl: string) => {
  const storageKey = `lectum:presentation-video-session:${profileId}:${hashVideoSessionStorageKey(videoUrl)}`;

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.sessionStorage.setItem(storageKey, generated);

    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatProfileTitle = (
  gender?: string | null,
  formationYears?: number | null,
  showExperienceTag?: boolean | null,
) => {
  const base =
    gender?.toLowerCase() === "feminino" || gender?.toLowerCase() === "mulher"
      ? "Psicóloga"
      : "Psicólogo";

  if (showExperienceTag === false) {
    return base;
  }

  const years = formationYears ?? 0;
  const yearsLabel = years === 1 ? "1 ano exp." : `${years} anos exp.`;

  return `${base} • ${yearsLabel}`;
};

const formatDisplayName = (name: string) => {
  return name;
};

const normalizePsychologistSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const filterPsychologistsByName = (
  psychologists: readonly DirectoryPsychologist[] | undefined,
  query: string,
  limit = 8,
) => {
  const typedName = normalizePsychologistSearchText(query);
  if (typedName.length < 2) return [];

  const seen = new Set<string>();

  return (psychologists ?? [])
    .filter((psychologist) =>
      normalizePsychologistSearchText(psychologist.name).includes(typedName),
    )
    .filter((psychologist) => {
      if (seen.has(psychologist.id)) return false;
      seen.add(psychologist.id);
      return true;
    })
    .slice(0, limit);
};

const splitNameForBadge = (name: string) => {
  const words = formatDisplayName(name).trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return {
      firstPart: "",
      lastPart: words[0] ?? "",
    };
  }

  return {
    firstPart: words.slice(0, -1).join(" "),
    lastPart: words[words.length - 1],
  };
};

const normalizeFormValues = (
  values: Partial<PsychologistsFilterForm>,
): PsychologistsFilterForm => ({
  search: values.search?.trim() || "",
  specialty: values.specialty?.trim() || null,
  service: values.service?.trim() || null,
  modality: values.modality?.trim() || null,
  approach: values.approach?.trim() || null,
  target_audience: values.target_audience?.trim() || null,
  state: values.state?.trim() || null,
  city: values.city?.trim() || null,
  gender: values.gender?.trim() || null,
  race_color: values.race_color?.trim() || null,
  religion: values.religion?.trim() || null,
  language: values.language?.trim() || null,
  more_experienced: Boolean(values.more_experienced),
  discount_first_session: Boolean(values.discount_first_session),
  accepts_insurance: Boolean(values.accepts_insurance),
  social_value: Boolean(values.social_value),
  available_today: Boolean(values.available_today),
  verified: Boolean(values.verified),
});

const toQuery = (values: PsychologistsFilterForm, page: number): DirectoryPsychologistsQuery => ({
  page,
  limit: PAGE_LIMIT,
  search: values.search?.trim() || undefined,
  specialty: values.specialty || undefined,
  service: values.service || undefined,
  modality: values.modality || undefined,
  approach: values.approach || undefined,
  target_audience: values.target_audience || undefined,
  state: values.state || undefined,
  city: values.city || undefined,
  gender: values.gender || undefined,
  race_color: values.race_color || undefined,
  religion: values.religion || undefined,
  language: values.language || undefined,
  more_experienced: values.more_experienced || undefined,
  discount_first_session: values.discount_first_session || undefined,
  accepts_insurance: values.accepts_insurance || undefined,
  social_value: values.social_value || undefined,
  available_today: values.available_today || undefined,
  verified: values.verified || undefined,
});

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const PsychologistFilterSearchSuggestions = ({
  isLoading,
  items,
  onSelect,
}: {
  isLoading: boolean;
  items: DirectoryPsychologist[];
  onSelect: (psychologist: DirectoryPsychologist) => void;
}) => (
  <div
    aria-label="Sugestões de psicólogos"
    className="mt-2 overflow-hidden rounded-2xl border border-border/80 bg-surface text-foreground shadow-[0_18px_45px_rgb(15_23_42_/_10%)]"
    onMouseDown={(event) => event.preventDefault()}
    role="listbox"
  >
    <div className="border-border/70 border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
      Profissionais encontrados
    </div>

    {isLoading ? (
      <div className="px-3 py-3 text-sm font-medium text-muted">Buscando psicólogos...</div>
    ) : items.length > 0 ? (
      <div className="max-h-[292px] overflow-y-auto py-1">
        {items.map((psychologist) => {
          const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);

          return (
            <button
              aria-label={`Abrir perfil de ${psychologist.name}`}
              aria-selected={false}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition duration-150 ease-out hover:bg-primary-soft/55 focus-visible:bg-primary-soft/65 focus-visible:outline-none"
              key={psychologist.id}
              onClick={() => onSelect(psychologist)}
              role="option"
              type="button"
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-extrabold text-primary ring-1 ring-primary/10">
                {avatarSrc ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={avatarSrc}
                    unoptimized={isPublicMediaUrl(psychologist.avatar)}
                  />
                ) : (
                  getInitials(psychologist.name)
                )}
              </span>

              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm font-extrabold leading-5 text-foreground">
                  {psychologist.name}
                </span>
                {psychologist.verified ? <VerifiedBadgeIcon className="h-4 w-4 shrink-0" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="px-3 py-3 text-sm font-medium text-muted">Nenhum psicólogo encontrado</div>
    )}
  </div>
);

const formatPlaybackRate = (rate: number) =>
  `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(1)}x`;

const getNextPlaybackRate = (currentRate: number) => {
  const currentIndex = IMMERSIVE_VIDEO_PLAYBACK_RATES.findIndex(
    (rate) => Math.abs(rate - currentRate) < 0.01,
  );
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

  return IMMERSIVE_VIDEO_PLAYBACK_RATES[nextIndex % IMMERSIVE_VIDEO_PLAYBACK_RATES.length];
};

const getReadableVideoDuration = (video: HTMLVideoElement) =>
  Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

const resetVideoElementToStart = (video: HTMLVideoElement) => {
  video.pause();

  if (video.currentTime === 0) return;

  try {
    video.currentTime = 0;
  } catch {
    // Alguns browsers podem negar seek antes de metadata suficiente; o proximo load mantem o inicio.
  }
};

const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const readFiltersFromParams = (params: URLSearchParams): PsychologistsFilterForm => {
  return normalizeFormValues({
    search: params.get("search") || "",
    specialty: params.get("specialty"),
    service: params.get("service"),
    modality: params.get("modality"),
    approach: params.get("approach"),
    target_audience: params.get("target_audience"),
    state: params.get("state"),
    city: params.get("city"),
    gender: params.get("gender"),
    race_color: params.get("race_color"),
    religion: params.get("religion"),
    language: params.get("language"),
    more_experienced: params.get("more_experienced") === "true",
    discount_first_session: params.get("discount_first_session") === "true",
    accepts_insurance: params.get("accepts_insurance") === "true",
    social_value: params.get("social_value") === "true",
    available_today: params.get("available_today") === "true",
    verified: params.get("verified") === "true",
  });
};

const buildFiltersParams = (values: PsychologistsFilterForm, page = 1) => {
  const normalized = normalizeFormValues(values);
  const next = new URLSearchParams();

  if (normalized.search?.trim()) next.set("search", normalized.search.trim());
  if (normalized.specialty) next.set("specialty", normalized.specialty);
  if (normalized.service) next.set("service", normalized.service);
  if (normalized.modality) next.set("modality", normalized.modality);
  if (normalized.approach) next.set("approach", normalized.approach);
  if (normalized.target_audience) next.set("target_audience", normalized.target_audience);
  if (normalized.state) next.set("state", normalized.state);
  if (normalized.city) next.set("city", normalized.city);
  if (normalized.gender) next.set("gender", normalized.gender);
  if (normalized.race_color) next.set("race_color", normalized.race_color);
  if (normalized.religion) next.set("religion", normalized.religion);
  if (normalized.language) next.set("language", normalized.language);
  if (normalized.more_experienced) next.set("more_experienced", "true");
  if (normalized.discount_first_session) next.set("discount_first_session", "true");
  if (normalized.accepts_insurance) next.set("accepts_insurance", "true");
  if (normalized.social_value) next.set("social_value", "true");
  if (normalized.available_today) next.set("available_today", "true");
  if (normalized.verified) next.set("verified", "true");
  if (page > 1) next.set("page", String(page));

  return next;
};

type PsychologistFilterKey = keyof PsychologistsFilterForm;

type ActiveFilterChip = {
  key: PsychologistFilterKey;
  label: string;
};

type LabelOption = {
  label: string;
  value: boolean | number | string;
};

const BOOLEAN_FILTER_LABELS = {
  verified: "Somente verificados",
  more_experienced: "Mais experientes",
  discount_first_session: "Desconto 1ª sessão",
  accepts_insurance: "Aceita convênio",
  social_value: "Valor social",
  available_today: "Disponível hoje",
} satisfies Partial<Record<PsychologistFilterKey, string>>;

type FilterFeatureKey = Extract<
  PsychologistFilterKey,
  | "verified"
  | "more_experienced"
  | "discount_first_session"
  | "accepts_insurance"
  | "social_value"
  | "available_today"
>;

type FilterFeatureOption = {
  name: FilterFeatureKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

const FILTER_FEATURE_OPTIONS: FilterFeatureOption[] = [
  {
    name: "available_today",
    label: "Disponível hoje",
    description: "Psicólogos com disponibilidade para atendimento ainda hoje.",
    icon: CalendarCheck,
  },
  {
    name: "verified",
    label: "Somente verificados",
    description: "Psicólogos com registro verificado junto ao Conselho Federal de Psicologia",
    icon: ShieldCheck,
  },
  {
    name: "more_experienced",
    label: "Mais experientes",
    description: "Psicólogos com mais de 10 anos de experiência.",
    icon: Award,
  },
  {
    name: "discount_first_session",
    label: "Desconto na 1ª sessão",
    description: "Psicólogos com condição especial para a primeira consulta.",
    icon: BadgePercent,
  },
  {
    name: "accepts_insurance",
    label: "Aceita convênios",
    description: "Psicólogos que atendem por planos de saúde.",
    icon: Stethoscope,
  },
  {
    name: "social_value",
    label: "Valor social",
    description: "Para a população de baixa renda.",
    icon: HandHeart,
  },
];

const FilterFeatureCard = ({
  checked,
  onToggle,
  option,
}: {
  checked: boolean;
  onToggle: (name: FilterFeatureKey) => void;
  option: FilterFeatureOption;
}) => {
  const Icon = option.icon;

  return (
    <button
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[22px] border p-3.5 text-left transition duration-200 ease-out sm:p-4",
        checked
          ? "border-primary/45 bg-surface shadow-[0_12px_28px_rgb(48_140_232_/_10%)]"
          : "border-border/70 bg-surface shadow-[0_8px_22px_rgb(15_23_42_/_4%)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_32px_rgb(15_23_42_/_7%)]",
      )}
      onClick={() => onToggle(option.name)}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition duration-200 ease-out",
          checked
            ? "bg-primary-soft text-primary ring-1 ring-primary/20"
            : "bg-primary-soft/70 text-primary",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold leading-5 text-foreground">
          {option.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
      </span>
      <span
        className={cn(
          "mt-1 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition duration-200 ease-out",
          checked
            ? "border-primary/45 bg-primary"
            : "border-border bg-surface-muted group-hover:border-primary/25",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full bg-surface text-transparent shadow-[0_2px_8px_rgb(15_23_42_/_12%)] transition duration-200 ease-out",
            checked && "translate-x-5 text-primary",
          )}
        >
          <Check className="h-3 w-3" aria-hidden="true" strokeWidth={2.8} />
        </span>
      </span>
    </button>
  );
};

const humanizeFilterValue = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("pt-BR"));

const findOptionLabel = (options: readonly LabelOption[], value?: string | null) => {
  if (!value) return null;

  return options.find((option) => String(option.value) === value)?.label ?? null;
};

const findCatalogLabel = (
  items: readonly DirectoryCatalogItem[] | undefined,
  value?: string | null,
) => {
  if (!value) return null;

  return items?.find((item) => item.slug === value || item.id === value)?.name ?? null;
};

const buildActiveFilterChips = (
  values: PsychologistsFilterForm,
  filters?: {
    specialties?: DirectoryCatalogItem[];
    services?: DirectoryCatalogItem[];
    approaches?: DirectoryCatalogItem[];
  },
) => {
  const normalizedValues = normalizeFormValues(values);
  const chips: ActiveFilterChip[] = [];
  const addChip = (key: PsychologistFilterKey, label?: string | null) => {
    const normalizedLabel = label?.trim();

    if (!normalizedLabel) return;

    chips.push({
      key,
      label: normalizedLabel,
    });
  };

  addChip("search", normalizedValues.search);
  addChip(
    "specialty",
    findCatalogLabel(filters?.specialties, normalizedValues.specialty) ??
      (normalizedValues.specialty ? humanizeFilterValue(normalizedValues.specialty) : null),
  );
  addChip(
    "service",
    findCatalogLabel(filters?.services, normalizedValues.service) ??
      (normalizedValues.service ? humanizeFilterValue(normalizedValues.service) : null),
  );
  addChip("modality", findOptionLabel(MODALITY_OPTIONS, normalizedValues.modality));
  addChip(
    "approach",
    findCatalogLabel(filters?.approaches, normalizedValues.approach) ??
      (normalizedValues.approach ? humanizeFilterValue(normalizedValues.approach) : null),
  );
  addChip(
    "target_audience",
    findOptionLabel(PUBLIC_TARGET_OPTIONS, normalizedValues.target_audience) ??
      (normalizedValues.target_audience
        ? humanizeFilterValue(normalizedValues.target_audience)
        : null),
  );
  addChip(
    "state",
    findOptionLabel(STATE_OPTIONS, normalizedValues.state) ??
      (normalizedValues.state ? humanizeFilterValue(normalizedValues.state) : null),
  );
  addChip(
    "city",
    findOptionLabel(
      normalizedValues.state ? (CITY_OPTIONS_BY_STATE[normalizedValues.state] ?? []) : [],
      normalizedValues.city,
    ) ?? normalizedValues.city,
  );
  addChip(
    "gender",
    findOptionLabel(GENDER_OPTIONS, normalizedValues.gender) ??
      (normalizedValues.gender ? humanizeFilterValue(normalizedValues.gender) : null),
  );
  addChip(
    "race_color",
    findOptionLabel(RACE_COLOR_OPTIONS, normalizedValues.race_color) ??
      (normalizedValues.race_color ? humanizeFilterValue(normalizedValues.race_color) : null),
  );
  addChip(
    "religion",
    findOptionLabel(RELIGION_OPTIONS, normalizedValues.religion) ??
      (normalizedValues.religion ? humanizeFilterValue(normalizedValues.religion) : null),
  );
  addChip(
    "language",
    findOptionLabel(LANGUAGE_OPTIONS, normalizedValues.language) ??
      (normalizedValues.language ? humanizeFilterValue(normalizedValues.language) : null),
  );

  for (const [key, label] of Object.entries(BOOLEAN_FILTER_LABELS)) {
    if (normalizedValues[key as PsychologistFilterKey]) {
      addChip(key as PsychologistFilterKey, label);
    }
  }

  return chips;
};

const buildBenefitChips = (
  psychologist:
    | {
        accepts_insurance?: boolean | null;
        discount_first_session?: boolean | null;
        social_value?: boolean | null;
      }
    | null
    | undefined,
) => {
  if (!psychologist) return [];

  const badges: Array<{
    id: string;
    label: string;
  }> = [];

  if (psychologist.discount_first_session) {
    badges.push({
      id: "discount-first-session",
      label: "Desconto 1ª sessão",
    });
  }

  if (psychologist.social_value) {
    badges.push({
      id: "social-value",
      label: "Valor social",
    });
  }

  if (psychologist.accepts_insurance) {
    badges.push({
      id: "accepts-insurance",
      label: "Aceita convênios",
    });
  }

  return badges;
};

const resolveDirectoryErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para consultar psicólogos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a listagem de psicólogos.";
};

const useViewportMetrics = () => {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 390 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      setWidth(window.innerWidth);
    };

    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return useMemo(() => {
    const effectiveWidth = Math.min(width, 430);
    const isDesktop = width >= 1024;
    const isCompact = effectiveWidth <= 390;
    const isTiny = effectiveWidth < 360;
    const actionHitSize = isTiny ? 40 : 44;
    const actionButtonSize = isTiny ? 30 : 32;
    const actionPrimaryButtonSize = isTiny ? 34 : 36;

    return {
      actionButtonSize,
      actionAvatarSize: actionButtonSize,
      actionGap: isCompact ? 4 : 6,
      actionHitSize,
      actionIconSize: isTiny ? 14 : 15,
      actionPrimaryButtonSize,
      actionRightPadding: isTiny ? 12 : 16,
      actionRailWidth: actionHitSize,
      actionStandaloneIconSize: isTiny ? 18 : 20,
      availableBadgeTextSize: isTiny ? 10 : 11,
      bioBottomOffset: isDesktop ? 24 : 8,
      ratingIconSize: isCompact ? 9 : 10,
      ratingLineHeight: 13,
      ratingTextSize: 10,
      bioLineHeight: 17,
      bioSize: 12,
      filterButtonSize: isCompact ? 40 : 42,
      horizontalPadding: isCompact ? 16 : 20,
      isDesktopLayout: isDesktop,
      navBarHeight: isDesktop ? 0 : DEFAULT_NAV_BAR_HEIGHT,
      searchHeight: isCompact ? 42 : 46,
      searchRightGap: isCompact ? 62 : 74,
      searchTop: isCompact ? 36 : 40,
      subtitleSize: isCompact ? 11 : 12,
      textColumnGap: isTiny ? 8 : 10,
      titleLineHeight: isTiny || isCompact ? 21 : 22,
      titleSize: isTiny || isCompact ? 17 : 18,
      verifiedBadgeSize: isTiny ? 12 : 14,
    };
  }, [width]);
};

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversion = useProgressiveConversion();
  const searchParamsString = searchParams.toString();
  const metrics = useViewportMetrics();
  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);
  const currentPage = useMemo(() => getPageFromParams(params), [params]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState(DEFAULT_VIDEO_PLAYBACK_RATE);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoPlaybackFailed, setIsVideoPlaybackFailed] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasLoadedSwipeHintPreference, setHasLoadedSwipeHintPreference] = useState(false);
  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(true);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [shouldNudgeSwipeCard, setShouldNudgeSwipeCard] = useState(false);
  const [activeOnboardingTip, setActiveOnboardingTip] = useState<PsychologistsOnboardingTip | null>(
    null,
  );
  const [actionColumnTranslateY, setActionColumnTranslateY] = useState(0);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [isVideoProgressSeeking, setIsVideoProgressSeeking] = useState(false);
  const [videoProgress, setVideoProgress] = useState<VideoProgressState>({
    currentTime: 0,
    duration: 0,
  });
  const [searchDraft, setSearchDraft] = useState(() => filterValues.search || "");
  const [filterModalSearchDraft, setFilterModalSearchDraft] = useState(
    () => filterValues.search || "",
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activePsychologistIndex, setActivePsychologistIndex] = useState(0);

  const filterDialogRef = useRef<HTMLDivElement | null>(null);
  const filterDialogCloseTimerRef = useRef<number | null>(null);
  const filterDialogOpenFrameRef = useRef<number | null>(null);
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const desktopSearchControlsRef = useRef<HTMLDivElement | null>(null);
  const bioTextRef = useRef<HTMLElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const actionColumnRef = useRef<HTMLDivElement | null>(null);
  const actionAnchorRef = useRef<HTMLElement | null>(null);
  const videoProgressStateRef = useRef<VideoProgressState>({
    currentTime: 0,
    duration: 0,
  });
  const feedVideoAnalyticsRef = useRef<FeedVideoAnalyticsState>(
    createEmptyFeedVideoAnalyticsState(),
  );
  const lastSearchParamsStringRef = useRef(searchParamsString);
  const lastActiveVideoResetKeyRef = useRef<string | null>(null);
  const tapTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const progressAnimationFrameRef = useRef<number | null>(null);
  const isVideoProgressSeekingRef = useRef(false);
  const lastVideoProgressStateSyncRef = useRef(0);
  const wasVideoPlayingBeforeProgressScrubRef = useRef(false);
  const videoSeekPreviewRatioRef = useRef<number | null>(null);
  const swipeHintNudgeTimeoutRef = useRef<number | null>(null);
  const hasShownInitialSwipeHintRef = useRef(false);
  const hasSyncedSwipeHintPreferenceRef = useRef(false);
  const hasPersistedSwipeHintSeenRef = useRef(false);
  const hasShownOnboardingTipThisVisitRef = useRef(false);
  const hasPersistedMySearchTipSeenRef = useRef(false);
  const hasPersistedWhatsappTipSeenRef = useRef(false);
  const hasPlayedSwipeNudgeRef = useRef(false);
  const suppressNextTapRef = useRef(false);
  const didLongPressRef = useRef(false);
  const didMoveDuringPressRef = useRef(false);
  const didMoveBeyondLongPressToleranceRef = useRef(false);
  const isSearchModeActiveRef = useRef(false);
  const shouldResumeVideoAfterSearchRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const desktopTouchStartYRef = useRef<number | null>(null);
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: true,
  });
  const accountTipsUserId = accountTips.userId;
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({
    enableProfile: false,
  });

  const deferredFilterModalSearchDraft = useDeferredValue(filterModalSearchDraft);
  const liveFilterValues = useMemo(
    () =>
      isFiltersOpen
        ? normalizeFormValues({
            ...filterValues,
            search: deferredFilterModalSearchDraft,
          })
        : filterValues,
    [deferredFilterModalSearchDraft, filterValues, isFiltersOpen],
  );
  const query = useMemo(
    () => toQuery(liveFilterValues, isFiltersOpen ? 1 : currentPage),
    [currentPage, isFiltersOpen, liveFilterValues],
  );
  const directory = useDirectoryPsychologists(query);
  const deferredSearchDraft = useDeferredValue(searchDraft);
  const suggestionSearch = deferredSearchDraft.trim();
  const shouldFetchSearchSuggestions = isSearchFocused && suggestionSearch.length >= 2;
  const suggestionQuery = useMemo<DirectoryPsychologistsQuery>(
    () => ({
      limit: 8,
      page: 1,
      search: suggestionSearch || undefined,
    }),
    [suggestionSearch],
  );
  const searchSuggestionsDirectory = useDirectoryPsychologists(
    suggestionQuery,
    shouldFetchSearchSuggestions,
  );
  const filterSuggestionSearch = deferredFilterModalSearchDraft.trim();
  const shouldFetchFilterSuggestions = isFiltersOpen && filterSuggestionSearch.length >= 2;
  const filterSuggestionQuery = useMemo<DirectoryPsychologistsQuery>(
    () => ({
      limit: 8,
      page: 1,
      search: filterSuggestionSearch || undefined,
    }),
    [filterSuggestionSearch],
  );
  const filterSuggestionsDirectory = useDirectoryPsychologists(
    filterSuggestionQuery,
    shouldFetchFilterSuggestions,
  );
  const response = directory.data;
  const psychologists = useMemo(() => response?.data ?? [], [response?.data]);
  const featuredPsychologist = psychologists[activePsychologistIndex] ?? psychologists[0];
  const backgroundVideoSrc = resolvePublicMediaUrl(featuredPsychologist?.video_url);
  const shouldShowVideo = Boolean(backgroundVideoSrc) && !isVideoPlaybackFailed;
  const isMobileSearchFocusMode = isSearchFocused && !metrics.isDesktopLayout;
  const activeVideoSource = shouldShowVideo ? backgroundVideoSrc : null;
  const featuredBio = featuredPsychologist?.headline?.trim() || "";
  const featuredBenefitChipsCount = buildBenefitChips(featuredPsychologist).length;
  const featuredPsychologistId = featuredPsychologist?.id;
  const activeVideoResetKey = featuredPsychologistId
    ? `${featuredPsychologistId}:${activeVideoSource ?? ""}`
    : null;
  const { mutate: trackFeaturedVideoWatch } = useDirectoryPsychologistVideoWatch(
    featuredPsychologistId ?? "",
  );

  const handleFilterSearchChange = useCallback((value: string) => {
    setFilterModalSearchDraft(value);
  }, []);

  const filterSuggestionItems = useMemo(
    () => filterPsychologistsByName(filterSuggestionsDirectory.data?.data, filterModalSearchDraft),
    [filterModalSearchDraft, filterSuggestionsDirectory.data?.data],
  );

  const openFilterDialogWithMotion = useCallback(() => {
    if (filterDialogCloseTimerRef.current) {
      window.clearTimeout(filterDialogCloseTimerRef.current);
      filterDialogCloseTimerRef.current = null;
    }

    if (filterDialogOpenFrameRef.current) {
      window.cancelAnimationFrame(filterDialogOpenFrameRef.current);
    }

    setIsFilterSheetOpen(false);
    setIsFiltersOpen(true);

    filterDialogOpenFrameRef.current = window.requestAnimationFrame(() => {
      setIsFilterSheetOpen(true);
      filterDialogOpenFrameRef.current = null;
    });
  }, []);

  const closeFilterDialogWithMotion = useCallback(() => {
    if (filterDialogOpenFrameRef.current) {
      window.cancelAnimationFrame(filterDialogOpenFrameRef.current);
      filterDialogOpenFrameRef.current = null;
    }

    setIsFilterSheetOpen(false);

    if (filterDialogCloseTimerRef.current) {
      window.clearTimeout(filterDialogCloseTimerRef.current);
    }

    filterDialogCloseTimerRef.current = window.setTimeout(() => {
      setIsFiltersOpen(false);
      filterDialogCloseTimerRef.current = null;
    }, FILTER_DIALOG_CLOSE_DELAY_MS);
  }, []);

  const handleFilterSuggestionSelect = useCallback(
    (psychologist: DirectoryPsychologist) => {
      setFilterModalSearchDraft("");
      closeFilterDialogWithMotion();
      router.push(`/psychologists/${psychologist.id}`);
    },
    [closeFilterDialogWithMotion, router],
  );

  const filterSearchSuggestionsSlot = useMemo(() => {
    if (filterModalSearchDraft.trim().length < 2) return null;

    return (
      <PsychologistFilterSearchSuggestions
        isLoading={filterSuggestionsDirectory.isFetching}
        items={filterSuggestionItems}
        onSelect={handleFilterSuggestionSelect}
      />
    );
  }, [
    filterModalSearchDraft,
    filterSuggestionItems,
    filterSuggestionsDirectory.isFetching,
    handleFilterSuggestionSelect,
  ]);

  const filters = usePsychologistsFilterForm({
    filters: response?.filters,
    loading: directory.isLoading || directory.isFetching,
    onSearchChange: handleFilterSearchChange,
    searchSuggestionsSlot: filterSearchSuggestionsSlot,
    values: filterValues,
  });

  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const hasActiveFilters =
    Boolean(filterValues.search?.trim()) ||
    Boolean(filterValues.specialty) ||
    Boolean(filterValues.service) ||
    Boolean(filterValues.modality) ||
    Boolean(filterValues.approach) ||
    Boolean(filterValues.target_audience) ||
    Boolean(filterValues.state) ||
    Boolean(filterValues.city) ||
    Boolean(filterValues.gender) ||
    Boolean(filterValues.race_color) ||
    Boolean(filterValues.religion) ||
    Boolean(filterValues.language) ||
    Boolean(filterValues.more_experienced) ||
    Boolean(filterValues.discount_first_session) ||
    Boolean(filterValues.accepts_insurance) ||
    Boolean(filterValues.social_value) ||
    Boolean(filterValues.available_today) ||
    Boolean(filterValues.verified);
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(filterValues, response?.filters),
    [filterValues, response?.filters],
  );

  const showInitialLoading = directory.isLoading && !response;
  const canSwipeBetweenPsychologists = psychologists.length > 1;
  const infoSectionBottom = `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + ${metrics.bioBottomOffset}px)`;
  const searchSuggestionItems = useMemo(
    () => filterPsychologistsByName(searchSuggestionsDirectory.data?.data, searchDraft, 5),
    [searchDraft, searchSuggestionsDirectory.data?.data],
  );
  const shouldRenderSearchSuggestions =
    isSearchFocused &&
    searchDraft.trim().length >= 2 &&
    (searchSuggestionsDirectory.isFetching || searchSuggestionItems.length > 0);

  const clearSwipeHintTimers = useCallback(() => {
    if (swipeHintNudgeTimeoutRef.current) {
      window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      swipeHintNudgeTimeoutRef.current = null;
    }
  }, []);

  const showSwipeHintUntilNavigation = useCallback((options?: { nudge?: boolean }) => {
    setShowSwipeHint(true);

    if (options?.nudge && !hasPlayedSwipeNudgeRef.current) {
      hasPlayedSwipeNudgeRef.current = true;
      setShouldNudgeSwipeCard(true);

      if (swipeHintNudgeTimeoutRef.current) {
        window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      }

      swipeHintNudgeTimeoutRef.current = window.setTimeout(() => {
        setShouldNudgeSwipeCard(false);
        swipeHintNudgeTimeoutRef.current = null;
      }, SWIPE_HINT_NUDGE_DURATION_MS);
    }
  }, []);

  const registerSwipeHintInteraction = useCallback(() => {
    if (swipeHintNudgeTimeoutRef.current) {
      window.clearTimeout(swipeHintNudgeTimeoutRef.current);
      swipeHintNudgeTimeoutRef.current = null;
    }

    setShouldNudgeSwipeCard(false);
  }, []);

  const persistSwipeHintSeen = useCallback(() => {
    if (
      hasPersistedSwipeHintSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_discover_psychologists_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedSwipeHintSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_discover_psychologists_tip: true,
      },
      {
        onError: () => {
          hasPersistedSwipeHintSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_discover_psychologists_tip,
    accountTips.updateOnboardingTips,
  ]);

  const persistMySearchTipSeen = useCallback(() => {
    if (
      !accountTipsUserId ||
      hasPersistedMySearchTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologists_my_search_tip
    ) {
      return;
    }

    hasPersistedMySearchTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologists_my_search_tip: true,
      },
      {
        onError: () => {
          hasPersistedMySearchTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologists_my_search_tip,
    accountTips.updateOnboardingTips,
    accountTipsUserId,
  ]);

  const persistWhatsappTipSeen = useCallback(() => {
    if (
      !accountTipsUserId ||
      hasPersistedWhatsappTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologist_whatsapp_tip
    ) {
      return;
    }

    hasPersistedWhatsappTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologist_whatsapp_tip: true,
      },
      {
        onError: () => {
          hasPersistedWhatsappTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologist_whatsapp_tip,
    accountTips.updateOnboardingTips,
    accountTipsUserId,
  ]);

  const markSwipeHintSeen = useCallback(() => {
    clearSwipeHintTimers();
    setShowSwipeHint(false);
    setShouldNudgeSwipeCard(false);
    setHasSeenSwipeHint(true);
    persistSwipeHintSeen();
  }, [clearSwipeHintTimers, persistSwipeHintSeen]);

  const resetVideoInteractionState = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    suppressNextTapRef.current = false;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    didMoveBeyondLongPressToleranceRef.current = false;
    isSearchModeActiveRef.current = false;
    shouldResumeVideoAfterSearchRef.current = false;
    pointerStartRef.current = null;

    setIsUiHidden(false);
    setIsLongPressing(false);
    setIsSearchFocused(false);
    setIsVideoProgressSeeking(false);
    isVideoProgressSeekingRef.current = false;
    wasVideoPlayingBeforeProgressScrubRef.current = false;
    videoSeekPreviewRatioRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (filterDialogCloseTimerRef.current) {
        window.clearTimeout(filterDialogCloseTimerRef.current);
      }

      if (filterDialogOpenFrameRef.current) {
        window.cancelAnimationFrame(filterDialogOpenFrameRef.current);
      }

      resetVideoInteractionState();
      clearSwipeHintTimers();
    };
  }, [clearSwipeHintTimers, resetVideoInteractionState]);

  useEffect(() => {
    if (typeof document === "undefined" || !metrics.isDesktopLayout) return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [metrics.isDesktopLayout]);

  useEffect(() => {
    hasSyncedSwipeHintPreferenceRef.current = false;
    hasPersistedSwipeHintSeenRef.current = false;
    hasPersistedMySearchTipSeenRef.current = false;
    hasPersistedWhatsappTipSeenRef.current = false;
    hasShownInitialSwipeHintRef.current = false;
    hasShownOnboardingTipThisVisitRef.current = false;
    hasPlayedSwipeNudgeRef.current = false;
    clearSwipeHintTimers();

    const frame = window.requestAnimationFrame(() => {
      setActiveOnboardingTip(null);
      setShowSwipeHint(false);
      setShouldNudgeSwipeCard(false);
      setHasSeenSwipeHint(true);
      setHasLoadedSwipeHintPreference(false);
    });

    if (!accountTipsUserId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTipsUserId, clearSwipeHintTimers]);

  useEffect(() => {
    if (hasSyncedSwipeHintPreferenceRef.current) return;
    if (accountTips.onboardingTips.isPending) return;

    hasSyncedSwipeHintPreferenceRef.current = true;

    const frame = window.requestAnimationFrame(() => {
      if (!accountTips.onboardingTips.isSuccess) {
        setHasSeenSwipeHint(true);
        setHasLoadedSwipeHintPreference(true);
        return;
      }

      setHasSeenSwipeHint(
        Boolean(accountTips.onboardingTips.data.has_seen_discover_psychologists_tip),
      );
      setHasLoadedSwipeHintPreference(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
  ]);

  useEffect(() => {
    if (
      !hasLoadedSwipeHintPreference ||
      hasSeenSwipeHint ||
      !canSwipeBetweenPsychologists ||
      showInitialLoading ||
      errorMessage ||
      hasShownInitialSwipeHintRef.current
    ) {
      return;
    }

    hasShownInitialSwipeHintRef.current = true;
    hasShownOnboardingTipThisVisitRef.current = true;
    showSwipeHintUntilNavigation({ nudge: true });
    persistSwipeHintSeen();
  }, [
    canSwipeBetweenPsychologists,
    errorMessage,
    hasLoadedSwipeHintPreference,
    hasSeenSwipeHint,
    persistSwipeHintSeen,
    showInitialLoading,
    showSwipeHintUntilNavigation,
  ]);

  useEffect(() => {
    if (lastSearchParamsStringRef.current === searchParamsString) return;

    lastSearchParamsStringRef.current = searchParamsString;
    const frame = window.requestAnimationFrame(() => {
      setActivePsychologistIndex(0);
      resetVideoInteractionState();
      feedContainerRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [resetVideoInteractionState, searchParamsString]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (psychologists.length === 0) {
        setActivePsychologistIndex(0);
        return;
      }

      if (activePsychologistIndex >= psychologists.length) {
        setActivePsychologistIndex(psychologists.length - 1);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activePsychologistIndex, psychologists.length]);

  const syncActionColumnAlignment = useCallback(() => {
    const hasBaselineContent = Boolean(featuredBio || featuredBenefitChipsCount > 0);
    const bioText = bioTextRef.current;
    const actionAnchor = actionAnchorRef.current;
    const actionColumn = actionColumnRef.current;

    if (!hasBaselineContent || !bioText || !actionAnchor || !actionColumn) return;

    const delta =
      bioText.getBoundingClientRect().bottom - actionAnchor.getBoundingClientRect().bottom;

    setActionColumnTranslateY((current) => (Math.abs(current - delta) > 0.5 ? delta : current));
  }, [featuredBenefitChipsCount, featuredBio]);

  const recalculateInfoOverlayLayout = useCallback(() => {
    syncActionColumnAlignment();
  }, [syncActionColumnAlignment]);

  const applyVideoProgressRatio = useCallback((ratio: number) => {
    const progressFill = progressFillRef.current;
    if (!progressFill) return;

    progressFill.style.transform = `scaleX(${clampNumber(ratio, 0, 1)})`;
  }, []);

  const syncActiveVideoProgress = useCallback(
    (video?: HTMLVideoElement | null, options?: { forceState?: boolean }) => {
      const currentVideo = video ?? backgroundVideoRef.current;

      if (!currentVideo) {
        applyVideoProgressRatio(0);
        const current = videoProgressStateRef.current;

        if (current.currentTime !== 0 || current.duration !== 0) {
          const nextProgress = {
            currentTime: 0,
            duration: 0,
          };

          videoProgressStateRef.current = nextProgress;
          setVideoProgress(nextProgress);
        }

        return;
      }

      const duration = getReadableVideoDuration(currentVideo);
      const currentTime = duration ? clampNumber(currentVideo.currentTime || 0, 0, duration) : 0;

      if (!isVideoProgressSeekingRef.current) {
        applyVideoProgressRatio(duration ? currentTime / duration : 0);
      }

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const current = videoProgressStateRef.current;

      const shouldUpdate =
        options?.forceState === true ||
        Math.abs(current.duration - duration) > 0.04 ||
        (currentTime === 0 && current.currentTime !== 0) ||
        now - lastVideoProgressStateSyncRef.current > 250;

      if (!shouldUpdate) return;

      lastVideoProgressStateSyncRef.current = now;

      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [applyVideoProgressRatio],
  );

  const ensureFeedVideoAnalyticsState = useCallback((profileId: string, videoUrl: string) => {
    const current = feedVideoAnalyticsRef.current;

    if (current.profileId === profileId && current.videoUrl === videoUrl) {
      if (!current.sessionKey) {
        current.sessionKey = createVideoSessionKey(profileId, videoUrl);
      }

      return current;
    }

    const next = createEmptyFeedVideoAnalyticsState();
    next.profileId = profileId;
    next.videoUrl = videoUrl;
    next.sessionKey = createVideoSessionKey(profileId, videoUrl);
    feedVideoAnalyticsRef.current = next;

    return next;
  }, []);

  const recordFeedVideoAnalyticsProgress = useCallback(
    (video: HTMLVideoElement) => {
      if (!featuredPsychologistId || !activeVideoSource) return null;

      const state = ensureFeedVideoAnalyticsState(featuredPsychologistId, activeVideoSource);
      const durationSeconds = Number.isFinite(video.duration)
        ? Math.max(0, Math.round(video.duration))
        : 0;
      const currentTime = Math.max(0, video.currentTime || 0);

      if (state.lastPosition > 2 && currentTime + 1 < state.lastPosition) {
        state.replayCount += 1;
      }

      state.lastPosition = currentTime;
      state.maxPosition = Math.max(state.maxPosition, currentTime);

      if (durationSeconds > 0) {
        const watchedSecond = Math.min(durationSeconds, Math.max(0, Math.floor(currentTime)));
        state.watchedSeconds.add(watchedSecond);

        const reachedPercent = Math.min(
          100,
          Math.max(0, (state.maxPosition / durationSeconds) * 100),
        );

        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          if (reachedPercent >= bucket) {
            state.retentionBuckets.add(bucket);
          }
        }

        state.milestones.milestone_25 ||= reachedPercent >= 25;
        state.milestones.milestone_50 ||= reachedPercent >= 50;
        state.milestones.milestone_75 ||= reachedPercent >= 75;
        state.milestones.milestone_100 ||= reachedPercent >= 98;
        state.completed ||= reachedPercent >= 98;
      }

      return state;
    },
    [activeVideoSource, ensureFeedVideoAnalyticsState, featuredPsychologistId],
  );

  const flushFeedVideoAnalytics = useCallback(
    (video: HTMLVideoElement | null, options?: { completed?: boolean; force?: boolean }) => {
      if (!video || !featuredPsychologistId || !activeVideoSource) return;
      if (accountTipsUserId && accountTipsUserId === featuredPsychologistId) return;

      const state = recordFeedVideoAnalyticsProgress(video);
      if (!state?.sessionKey) return;

      const now = Date.now();
      if (!options?.force && now - state.lastSentAt < VIDEO_ANALYTICS_HEARTBEAT_MS) return;

      if (options?.completed) {
        state.completed = true;
        state.milestones.milestone_100 = true;
        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          state.retentionBuckets.add(bucket);
        }
      }

      const durationSeconds = Number.isFinite(video.duration)
        ? Math.max(0, Math.round(video.duration))
        : 0;
      const payload: DirectoryPsychologistVideoWatchPayload = {
        session_key: state.sessionKey,
        duration_seconds: durationSeconds,
        watched_seconds: Math.max(0, state.watchedSeconds.size),
        max_position_seconds: Math.max(0, Math.round(state.maxPosition)),
        replay_count: state.replayCount,
        completed: state.completed,
        ...state.milestones,
      };

      if (
        payload.watched_seconds === 0 &&
        payload.max_position_seconds === 0 &&
        !payload.completed
      ) {
        return;
      }

      state.lastSentAt = now;
      trackFeaturedVideoWatch(payload);
    },
    [
      accountTipsUserId,
      activeVideoSource,
      featuredPsychologistId,
      recordFeedVideoAnalyticsProgress,
      trackFeaturedVideoWatch,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      recalculateInfoOverlayLayout();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [recalculateInfoOverlayLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      recalculateInfoOverlayLayout();
    };

    const bioNode = bioTextRef.current;
    const resizeObserver = bioNode
      ? new ResizeObserver(() => recalculateInfoOverlayLayout())
      : null;

    if (bioNode) {
      resizeObserver?.observe(bioNode);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [recalculateInfoOverlayLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasActiveVideoChanged = lastActiveVideoResetKeyRef.current !== activeVideoResetKey;
    const nextPlaybackRate = hasActiveVideoChanged
      ? DEFAULT_VIDEO_PLAYBACK_RATE
      : videoPlaybackRate;
    const nextVolume = clampNumber(videoVolume, 0, 1);
    let activeVideo: HTMLVideoElement | null = null;

    const videos = document.querySelectorAll<HTMLVideoElement>(
      PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR,
    );

    for (const video of videos) {
      const isActiveVideo = video.dataset.psychologistId === featuredPsychologistId;
      video.muted = isVideoMuted;
      video.volume = nextVolume;
      video.playbackRate = nextPlaybackRate;

      if (!isActiveVideo || !activeVideoSource) {
        resetVideoElementToStart(video);
        continue;
      }

      activeVideo = video;

      if (hasActiveVideoChanged) {
        resetVideoElementToStart(video);
      }
    }

    if (hasActiveVideoChanged) {
      const nextProgress = {
        currentTime: 0,
        duration: activeVideo ? getReadableVideoDuration(activeVideo) : 0,
      };

      setIsVideoPaused(false);
      setVideoPlaybackRate(DEFAULT_VIDEO_PLAYBACK_RATE);
      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
      applyVideoProgressRatio(0);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      videoSeekPreviewRatioRef.current = null;
      feedVideoAnalyticsRef.current = createEmptyFeedVideoAnalyticsState();
    }

    lastActiveVideoResetKeyRef.current = activeVideoResetKey;

    if (!activeVideo || !activeVideoSource || isVideoPaused) {
      activeVideo?.pause();
      return;
    }

    void activeVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [
    activeVideoResetKey,
    activeVideoSource,
    applyVideoProgressRatio,
    featuredPsychologistId,
    isVideoMuted,
    isVideoPaused,
    videoPlaybackRate,
    videoVolume,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeVideoSource || !featuredPsychologistId) return;

    if (isVideoProgressSeeking) {
      return;
    }

    if (isVideoPaused) {
      syncActiveVideoProgress(undefined, {
        forceState: true,
      });
      return;
    }

    const tick = () => {
      syncActiveVideoProgress();
      progressAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    progressAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (progressAnimationFrameRef.current) {
        window.cancelAnimationFrame(progressAnimationFrameRef.current);
        progressAnimationFrameRef.current = null;
      }
    };
  }, [
    activeVideoSource,
    featuredPsychologistId,
    isVideoPaused,
    isVideoProgressSeeking,
    syncActiveVideoProgress,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = isVideoMuted;
      });
  }, [isVideoMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!featuredPsychologistId) return;

    const frame = window.requestAnimationFrame(() => {
      const nextProgress = {
        currentTime: 0,
        duration: 0,
      };

      resetVideoInteractionState();
      setIsVideoPlaybackFailed(false);
      setIsVideoPaused(false);
      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
      applyVideoProgressRatio(0);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      videoSeekPreviewRatioRef.current = null;
      setShareFeedback(false);
      setActionColumnTranslateY(0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [applyVideoProgressRatio, featuredPsychologistId, resetVideoInteractionState]);

  const stopInteractionPropagation = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  }, []);

  const handleWhatsappInteraction = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      hasShownOnboardingTipThisVisitRef.current = true;
      persistWhatsappTipSeen();
      setActiveOnboardingTip((current) => (current === "whatsapp" ? null : current));
    },
    [persistWhatsappTipSeen],
  );

  const navigateToPublicPsychologistProfile = useCallback(
    (
      psychologistId: string,
      event: { preventDefault?: () => void; stopPropagation: () => void },
    ) => {
      event.preventDefault?.();
      event.stopPropagation();

      router.push(`/psychologists/${psychologistId}`);
    },
    [router],
  );

  const cancelPendingVideoGestureTimers = useCallback(() => {
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    pointerStartRef.current = null;
    didLongPressRef.current = false;
    didMoveDuringPressRef.current = false;
    suppressNextTapRef.current = false;
    setIsLongPressing(false);
  }, []);

  const applyFilterValues = useCallback(
    (values: PsychologistsFilterForm) => {
      const next = buildFiltersParams(normalizeFormValues(values), 1);

      router.replace(next.toString() ? `/psychologists?${next}` : "/psychologists", {
        scroll: false,
      });
    },
    [router],
  );

  const enterSearchMode = useCallback(() => {
    if (isSearchModeActiveRef.current) {
      setIsSearchFocused(true);
      return;
    }

    isSearchModeActiveRef.current = true;
    cancelPendingVideoGestureTimers();

    if (metrics.isDesktopLayout) {
      shouldResumeVideoAfterSearchRef.current = false;
      setIsSearchFocused(true);
      return;
    }

    const currentVideo = backgroundVideoRef.current;
    shouldResumeVideoAfterSearchRef.current = Boolean(
      currentVideo && shouldShowVideo && !currentVideo.paused,
    );

    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    setIsSearchFocused(true);
  }, [cancelPendingVideoGestureTimers, metrics.isDesktopLayout, shouldShowVideo]);

  const exitSearchMode = useCallback(
    (options?: { resumeVideo?: boolean; shouldBlur?: boolean }) => {
      if (options?.shouldBlur !== false) {
        searchInputRef.current?.blur();
      }

      isSearchModeActiveRef.current = false;
      setIsSearchFocused(false);

      const shouldResumeVideo =
        options?.resumeVideo !== false && shouldResumeVideoAfterSearchRef.current;
      shouldResumeVideoAfterSearchRef.current = false;

      if (!shouldResumeVideo) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      setIsVideoPaused(false);
      void currentVideo.play().catch(() => {
        setIsVideoPaused(true);
      });
    },
    [shouldShowVideo],
  );

  const handleSubmitFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void filters.hook.handleSubmit((values) => {
        const nextValues = normalizeFormValues({
          ...filterValues,
          ...values,
        });

        setSearchDraft(nextValues.search || "");
        setFilterModalSearchDraft(nextValues.search || "");
        applyFilterValues(nextValues);
        closeFilterDialogWithMotion();
      })(event);
    },
    [applyFilterValues, closeFilterDialogWithMotion, filterValues, filters.hook],
  );

  const clearFilters = useCallback(() => {
    filters.hook.reset(defaultPsychologistsFilterValues);
    setSearchDraft("");
    setFilterModalSearchDraft("");
    exitSearchMode();
    applyFilterValues(defaultPsychologistsFilterValues);
    closeFilterDialogWithMotion();
  }, [applyFilterValues, closeFilterDialogWithMotion, exitSearchMode, filters.hook]);

  const toggleFilterFeature = useCallback(
    (name: FilterFeatureKey) => {
      const currentValue = Boolean(filters.hook.getValues(name));

      filters.hook.setValue(name, !currentValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [filters.hook],
  );

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextSearch = searchDraft.trim();

      setSearchDraft(nextSearch);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: nextSearch,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues, searchDraft],
  );

  const handleSearchSuggestionSelect = useCallback(
    (name: string) => {
      setSearchDraft(name);
      exitSearchMode();
      applyFilterValues({
        ...filterValues,
        search: name,
      });
    },
    [applyFilterValues, exitSearchMode, filterValues],
  );

  const handleFiltersOpen = useCallback(() => {
    exitSearchMode({
      resumeVideo: false,
    });

    const currentVideo = backgroundVideoRef.current;
    if (currentVideo && shouldShowVideo) {
      currentVideo.pause();
      setIsVideoPaused(true);
    }

    filters.hook.reset(filterValues);
    setFilterModalSearchDraft(filterValues.search || "");
    openFilterDialogWithMotion();
  }, [exitSearchMode, filterValues, filters.hook, openFilterDialogWithMotion, shouldShowVideo]);

  const handleFiltersClose = useCallback(() => {
    filters.hook.reset(filterValues);
    setFilterModalSearchDraft(filterValues.search || "");
    closeFilterDialogWithMotion();
  }, [closeFilterDialogWithMotion, filterValues, filters.hook]);

  const handleExploreModeClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      registerSwipeHintInteraction();

      if (hasActiveFilters) {
        clearFilters();
      }
    },
    [clearFilters, hasActiveFilters, registerSwipeHintInteraction],
  );

  const handleMySearchModeClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      registerSwipeHintInteraction();
      hasShownOnboardingTipThisVisitRef.current = true;
      persistMySearchTipSeen();
      setActiveOnboardingTip((current) => (current === "mySearch" ? null : current));
      handleFiltersOpen();
    },
    [handleFiltersOpen, persistMySearchTipSeen, registerSwipeHintInteraction],
  );

  const handleRemoveActiveFilter = useCallback(
    (key: PsychologistFilterKey) => {
      const nextValues = normalizeFormValues(filterValues);

      switch (key) {
        case "search":
          nextValues.search = "";
          setSearchDraft("");
          break;
        case "specialty":
          nextValues.specialty = null;
          break;
        case "service":
          nextValues.service = null;
          break;
        case "modality":
          nextValues.modality = null;
          break;
        case "approach":
          nextValues.approach = null;
          break;
        case "target_audience":
          nextValues.target_audience = null;
          break;
        case "state":
          nextValues.state = null;
          nextValues.city = null;
          break;
        case "city":
          nextValues.city = null;
          break;
        case "gender":
          nextValues.gender = null;
          break;
        case "race_color":
          nextValues.race_color = null;
          break;
        case "religion":
          nextValues.religion = null;
          break;
        case "language":
          nextValues.language = null;
          break;
        case "verified":
          nextValues.verified = false;
          break;
        case "more_experienced":
          nextValues.more_experienced = false;
          break;
        case "discount_first_session":
          nextValues.discount_first_session = false;
          break;
        case "accepts_insurance":
          nextValues.accepts_insurance = false;
          break;
        case "social_value":
          nextValues.social_value = false;
          break;
        case "available_today":
          nextValues.available_today = false;
          break;
      }

      filters.hook.reset(nextValues);
      applyFilterValues(nextValues);
    },
    [applyFilterValues, filterValues, filters.hook],
  );

  const pauseVideoPlayback = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.pause();
    setIsVideoPaused(true);
  }, [shouldShowVideo]);

  const unmuteAllVideos = useCallback(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = false;
      });
  }, []);

  const playCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.playbackRate = videoPlaybackRate;
    setIsVideoPaused(false);
    void currentVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [shouldShowVideo, videoPlaybackRate]);

  const unmuteCurrentVideo = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;

    if (currentVideo) {
      currentVideo.muted = false;
      if (currentVideo.volume <= 0) {
        currentVideo.volume = 1;
      }
      setVideoVolume(currentVideo.volume);
    }

    unmuteAllVideos();
    setIsVideoMuted(false);
  }, [unmuteAllVideos]);

  const playCurrentVideoWithSound = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;
    if (!currentVideo || !shouldShowVideo) return;

    currentVideo.playbackRate = videoPlaybackRate;
    unmuteCurrentVideo();
    setIsVideoPaused(false);

    void playVideoWithSound(currentVideo).then((played) => {
      if (!played) {
        setIsVideoPaused(true);
      }
    });
  }, [shouldShowVideo, unmuteCurrentVideo, videoPlaybackRate]);

  const setAllVideosMuted = useCallback((muted: boolean) => {
    if (typeof window !== "undefined") {
      document
        .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
        .forEach((video) => {
          video.muted = muted;
        });
    }

    const currentVideo = backgroundVideoRef.current;
    if (currentVideo) {
      currentVideo.muted = muted;
    }

    setIsVideoMuted(muted);
  }, []);

  const setAllVideosPlaybackRate = useCallback((playbackRate: number) => {
    if (typeof window !== "undefined") {
      document
        .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
        .forEach((video) => {
          video.playbackRate = playbackRate;
        });
    }

    const currentVideo = backgroundVideoRef.current;
    if (currentVideo) {
      currentVideo.playbackRate = playbackRate;
    }

    setVideoPlaybackRate(playbackRate);
  }, []);

  const stopVideoControlInteraction = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.stopPropagation();
      event.preventDefault?.();
      cancelPendingVideoGestureTimers();
    },
    [cancelPendingVideoGestureTimers],
  );

  const handleImmersiveExit = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);
      setIsUiHidden(false);
    },
    [stopVideoControlInteraction],
  );

  const handleImmersivePlaybackToggle = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      if (currentVideo.paused || isVideoPaused) {
        playCurrentVideo();
        return;
      }

      pauseVideoPlayback();
    },
    [
      isVideoPaused,
      pauseVideoPlayback,
      playCurrentVideo,
      shouldShowVideo,
      stopVideoControlInteraction,
    ],
  );

  const handleImmersiveMuteToggle = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);
      setAllVideosMuted(!isVideoMuted);
    },
    [isVideoMuted, setAllVideosMuted, stopVideoControlInteraction],
  );

  const handleImmersivePlaybackRateToggle = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);
      setAllVideosPlaybackRate(getNextPlaybackRate(videoPlaybackRate));
    },
    [setAllVideosPlaybackRate, stopVideoControlInteraction, videoPlaybackRate],
  );

  const handleImmersiveFullscreen = useCallback(
    async (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      stopVideoControlInteraction(event);

      if (!shouldShowVideo) return;

      await requestVideoFullscreen(backgroundVideoRef.current, {
        forceContain: true,
        temporaryControls: true,
      });
    },
    [shouldShowVideo, stopVideoControlInteraction],
  );

  const handleFeedScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const container = event.currentTarget;
      if (psychologists.length === 0) return;

      let nextIndex = activePsychologistIndex;

      if (metrics.isDesktopLayout) {
        const slides = Array.from(
          container.querySelectorAll<HTMLElement>("[data-psychologists-slide-index]"),
        );

        const nearestSlide = slides.reduce<HTMLElement | null>((nearest, slide) => {
          if (!nearest) return slide;

          const currentDistance = Math.abs(slide.offsetTop - container.scrollTop);
          const nearestDistance = Math.abs(nearest.offsetTop - container.scrollTop);

          return currentDistance < nearestDistance ? slide : nearest;
        }, null);

        const slideIndex = Number(nearestSlide?.dataset.psychologistsSlideIndex);

        if (Number.isFinite(slideIndex)) {
          nextIndex = Math.max(0, Math.min(psychologists.length - 1, slideIndex));
        }
      } else {
        const slideHeight = container.clientHeight;
        if (slideHeight <= 0) return;

        nextIndex = Math.max(
          0,
          Math.min(psychologists.length - 1, Math.round(container.scrollTop / slideHeight)),
        );
      }

      if (nextIndex !== activePsychologistIndex) {
        markSwipeHintSeen();
        setActivePsychologistIndex(nextIndex);
      }
    },
    [
      activePsychologistIndex,
      isSearchFocused,
      markSwipeHintSeen,
      metrics.isDesktopLayout,
      psychologists.length,
    ],
  );

  const scrollToPsychologistIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (psychologists.length === 0) return;

      const nextIndex = Math.max(0, Math.min(psychologists.length - 1, index));
      const container = feedContainerRef.current;

      if (nextIndex !== activePsychologistIndex) {
        markSwipeHintSeen();
      }
      setActivePsychologistIndex(nextIndex);

      if (!container) return;

      const targetSlide = container.querySelector<HTMLElement>(
        `[data-psychologists-slide-index="${nextIndex}"]`,
      );

      container.scrollTo({
        behavior,
        top: targetSlide?.offsetTop ?? nextIndex * container.clientHeight,
      });
    },
    [activePsychologistIndex, markSwipeHintSeen, psychologists.length],
  );

  const navigateToPreviousPsychologist = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation();
      scrollToPsychologistIndex(activePsychologistIndex - 1);
    },
    [activePsychologistIndex, scrollToPsychologistIndex],
  );

  const navigateToNextPsychologist = useCallback(
    (event: { preventDefault?: () => void; stopPropagation: () => void }) => {
      event.preventDefault?.();
      event.stopPropagation();
      scrollToPsychologistIndex(activePsychologistIndex + 1);
    },
    [activePsychologistIndex, scrollToPsychologistIndex],
  );

  const shouldForwardDesktopFeedScroll = useCallback(() => {
    return (
      metrics.isDesktopLayout &&
      !isFiltersOpen &&
      !isSearchFocused &&
      !isVideoProgressSeeking &&
      psychologists.length > 0
    );
  }, [
    isFiltersOpen,
    isSearchFocused,
    isVideoProgressSeeking,
    metrics.isDesktopLayout,
    psychologists.length,
  ]);

  const handleDesktopPageWheelCapture = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      const container = feedContainerRef.current;
      if (!container) return;

      event.preventDefault();
      registerSwipeHintInteraction();
      container.scrollBy({
        behavior: "auto",
        left: event.deltaX,
        top: event.deltaY,
      });
    },
    [registerSwipeHintInteraction, shouldForwardDesktopFeedScroll],
  );

  const handleDesktopPageTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      desktopTouchStartYRef.current = event.touches[0]?.clientY ?? null;
    },
    [shouldForwardDesktopFeedScroll],
  );

  const handleDesktopPageTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (isPsychologistsScrollLockTarget(event.target)) return;
      if (!shouldForwardDesktopFeedScroll()) return;

      const touch = event.touches[0];
      const lastY = desktopTouchStartYRef.current;
      const container = feedContainerRef.current;

      if (!touch || lastY === null || !container) return;

      const deltaY = lastY - touch.clientY;
      if (Math.abs(deltaY) < 1) return;

      event.preventDefault();
      registerSwipeHintInteraction();
      container.scrollBy({
        behavior: "auto",
        top: deltaY,
      });
      desktopTouchStartYRef.current = touch.clientY;
    },
    [registerSwipeHintInteraction, shouldForwardDesktopFeedScroll],
  );

  const handleDesktopPageTouchEnd = useCallback(() => {
    desktopTouchStartYRef.current = null;
  }, []);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const timer = window.setTimeout(() => {
      filterDialogRef.current?.focus();
    }, 280);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleFiltersClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleFiltersClose, isFiltersOpen]);

  useEffect(() => {
    if (!isSearchFocused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      exitSearchMode();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exitSearchMode, isSearchFocused]);

  useEffect(() => {
    if (!metrics.isDesktopLayout || !isSearchFocused) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isSearchFocused, metrics.isDesktopLayout]);

  useEffect(() => {
    if (!metrics.isDesktopLayout || !isSearchFocused) return;

    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (desktopSearchControlsRef.current?.contains(target)) return;

      suppressNextTapRef.current = true;
      cancelPendingVideoGestureTimers();
      exitSearchMode();
      window.setTimeout(() => {
        suppressNextTapRef.current = false;
      }, 0);
    };

    window.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [cancelPendingVideoGestureTimers, exitSearchMode, isSearchFocused, metrics.isDesktopLayout]);

  const toggleFavorite = useCallback(
    (psychologist: DirectoryPsychologist) => {
      if (isMobileSearchFocusMode) return;

      const psychologistId = psychologist.id;

      if (!conversion.isAuthenticated) {
        conversion.requestConversion("trigger_favorito", {
          intent: {
            payload: {
              psychologistId,
            },
            type: "favorite_psychologist",
          },
        });
        return;
      }

      const currentFavorited = favoriteOverrides[psychologistId] ?? Boolean(psychologist.favorited);
      const nextFavorited = !currentFavorited;
      const clearFavoriteOverride = () => {
        setFavoriteOverrides((current) => {
          const next = { ...current };
          delete next[psychologistId];
          return next;
        });
      };

      setFavoriteOverrides((current) => ({
        ...current,
        [psychologistId]: nextFavorited,
      }));

      if (nextFavorited) {
        favoritePsychologist.mutate(psychologistId, {
          onError: clearFavoriteOverride,
          onSuccess: clearFavoriteOverride,
        });
        return;
      }

      unfavoritePsychologist.mutate(psychologistId, {
        onError: clearFavoriteOverride,
        onSuccess: clearFavoriteOverride,
      });
    },
    [
      conversion,
      favoriteOverrides,
      favoritePsychologist,
      isMobileSearchFocusMode,
      unfavoritePsychologist,
    ],
  );

  const favoritePsychologistIfNeeded = useCallback(
    (psychologist: DirectoryPsychologist) => {
      const psychologistId = psychologist.id;
      const isFavorited = favoriteOverrides[psychologistId] ?? Boolean(psychologist.favorited);

      if (isFavorited) return;

      toggleFavorite(psychologist);
    },
    [favoriteOverrides, toggleFavorite],
  );

  useEffect(() => {
    if (!conversion.isAuthenticated || psychologists.length === 0) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "favorite_psychologist" &&
        psychologists.some((item) => item.id === String(candidate.payload?.psychologistId ?? "")),
    );
    const psychologistId = String(intent?.payload?.psychologistId ?? "");
    if (!psychologistId) return;

    const psychologist = psychologists.find((item) => item.id === psychologistId);
    if (!psychologist) return;
    if (favoriteOverrides[psychologistId] ?? psychologist.favorited) return;

    window.setTimeout(() => toggleFavorite(psychologist), 0);
  }, [conversion, favoriteOverrides, psychologists, toggleFavorite]);

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;

  const shareCurrent = useCallback(
    async (psychologist: DirectoryPsychologist) => {
      if (isSharing) return;

      const url =
        typeof window === "undefined"
          ? ""
          : `${window.location.origin}/psychologists/${psychologist.id}`;

      try {
        setIsSharing(true);
        if (typeof window !== "undefined" && "share" in navigator) {
          await navigator.share({
            title: `Perfil de ${psychologist.name}`,
            text: psychologist.headline || "Perfis de Psicólogos na Lectum",
            url,
          });
          return;
        }

        if (url) {
          await navigator.clipboard.writeText(url);
          setShareFeedback(true);
          window.setTimeout(() => setShareFeedback(false), 1800);
        }
      } finally {
        setIsSharing(false);
      }
    },
    [isSharing],
  );

  const runVideoAreaSingleTapAction = useCallback(() => {
    const currentVideo = backgroundVideoRef.current;

    if (shouldShowVideo && currentVideo) {
      const shouldActivateVideoWithSound =
        isVideoMuted ||
        currentVideo.muted ||
        currentVideo.volume <= 0 ||
        currentVideo.paused ||
        currentVideo.ended ||
        isVideoPaused;

      if (shouldActivateVideoWithSound) {
        playCurrentVideoWithSound();
        setIsUiHidden(true);
        return;
      }

      setIsUiHidden((current) => !current);
      return;
    }

    setIsUiHidden((current) => !current);
  }, [isVideoMuted, isVideoPaused, playCurrentVideoWithSound, shouldShowVideo]);

  const handleVideoAreaTap = useCallback(
    (psychologist: DirectoryPsychologist, uiHidden: boolean) => {
      if (isSearchFocused) return;

      if (suppressNextTapRef.current || didMoveDuringPressRef.current) {
        suppressNextTapRef.current = false;
        didMoveDuringPressRef.current = false;
        return;
      }

      if (didLongPressRef.current) {
        didLongPressRef.current = false;
        return;
      }

      if (!uiHidden && shouldShowVideo) {
        if (tapTimeoutRef.current) {
          window.clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
          favoritePsychologistIfNeeded(psychologist);
          return;
        }

        tapTimeoutRef.current = window.setTimeout(() => {
          tapTimeoutRef.current = null;
          runVideoAreaSingleTapAction();
        }, VIDEO_SINGLE_TAP_DELAY_MS);
        return;
      }

      runVideoAreaSingleTapAction();
    },
    [favoritePsychologistIfNeeded, isSearchFocused, runVideoAreaSingleTapAction, shouldShowVideo],
  );

  const handleLongPressStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      pointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      didMoveDuringPressRef.current = false;
      didMoveBeyondLongPressToleranceRef.current = false;
      didLongPressRef.current = false;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }

      longPressTimeoutRef.current = window.setTimeout(() => {
        if (didMoveDuringPressRef.current) return;

        const currentVideo = backgroundVideoRef.current;
        if (!currentVideo) return;

        didLongPressRef.current = true;
        suppressNextTapRef.current = true;

        if (tapTimeoutRef.current) {
          window.clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }

        currentVideo.pause();
        setIsVideoPaused(true);
        setIsLongPressing(true);
      }, VIDEO_LONG_PRESS_DELAY_MS);
    },
    [isSearchFocused, shouldShowVideo],
  );

  const handleLongPressMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const start = pointerStartRef.current;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const absoluteDeltaX = Math.abs(deltaX);
      const absoluteDeltaY = Math.abs(deltaY);
      const distance = Math.hypot(deltaX, deltaY);

      if (distance <= LONG_PRESS_MOVE_TOLERANCE_PX) return;

      didMoveBeyondLongPressToleranceRef.current = true;

      const hasVerticalScrollIntent =
        absoluteDeltaY >= LONG_PRESS_SCROLL_INTENT_THRESHOLD_PX &&
        absoluteDeltaY >= absoluteDeltaX * LONG_PRESS_VERTICAL_DOMINANCE_RATIO;
      const hasSignificantDragIntent = distance >= LONG_PRESS_SIGNIFICANT_DRAG_THRESHOLD_PX;

      if (!hasVerticalScrollIntent && !hasSignificantDragIntent) return;

      didMoveDuringPressRef.current = true;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      didLongPressRef.current = false;
      suppressNextTapRef.current = true;
      playCurrentVideo();
    },
    [playCurrentVideo],
  );

  const handleLongPressEnd = useCallback(
    (event?: PointerEvent<HTMLButtonElement>) => {
      if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      pointerStartRef.current = null;

      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (
        (didMoveDuringPressRef.current || didMoveBeyondLongPressToleranceRef.current) &&
        !didLongPressRef.current
      ) {
        suppressNextTapRef.current = true;
        window.setTimeout(() => {
          suppressNextTapRef.current = false;
          didMoveDuringPressRef.current = false;
          didMoveBeyondLongPressToleranceRef.current = false;
        }, VIDEO_SINGLE_TAP_DELAY_MS);
        return;
      }

      if (!didLongPressRef.current) return;

      setIsLongPressing(false);
      playCurrentVideo();

      window.setTimeout(() => {
        suppressNextTapRef.current = false;
        didLongPressRef.current = false;
        didMoveDuringPressRef.current = false;
        didMoveBeyondLongPressToleranceRef.current = false;
      }, VIDEO_SINGLE_TAP_DELAY_MS);
    },
    [playCurrentVideo],
  );

  const handleVideoControlTap = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      if (
        isVideoMuted ||
        currentVideo.muted ||
        currentVideo.volume <= 0 ||
        currentVideo.paused ||
        isVideoPaused
      ) {
        playCurrentVideoWithSound();
        setIsUiHidden(true);
        return;
      }

      if (!currentVideo.paused) {
        pauseVideoPlayback();
      }
    },
    [isVideoMuted, isVideoPaused, pauseVideoPlayback, playCurrentVideoWithSound, shouldShowVideo],
  );

  const seekActiveVideoToTime = useCallback(
    (nextTime: number, durationOverride?: number) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      const duration =
        getReadableVideoDuration(currentVideo) || durationOverride || videoProgress.duration;
      if (!duration) return;

      const currentTime = clampNumber(nextTime, 0, duration);
      currentVideo.currentTime = currentTime;
      applyVideoProgressRatio(duration ? currentTime / duration : 0);
      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [applyVideoProgressRatio, videoProgress.duration],
  );

  const getVideoProgressRatioFromClientX = useCallback(
    (clientX: number, track: HTMLDivElement | null) => {
      if (!track) return null;

      const bounds = track.getBoundingClientRect();
      if (bounds.width <= 0) return null;

      return clampNumber((clientX - bounds.left) / bounds.width, 0, 1);
    },
    [],
  );

  const seekActiveVideoToRatio = useCallback(
    (ratio: number) => {
      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const currentTime = clampNumber(ratio, 0, 1) * duration;
      currentVideo.currentTime = currentTime;
      applyVideoProgressRatio(duration ? currentTime / duration : 0);
      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [applyVideoProgressRatio, videoProgress.duration],
  );

  const previewActiveVideoSeekToRatio = useCallback(
    (ratio: number) => {
      const clampedRatio = clampNumber(ratio, 0, 1);
      const currentVideo = backgroundVideoRef.current;
      const duration = currentVideo ? getReadableVideoDuration(currentVideo) : 0;
      const resolvedDuration = duration || videoProgressStateRef.current.duration;

      applyVideoProgressRatio(clampedRatio);

      if (!resolvedDuration) return;

      const nextProgress = {
        currentTime: clampedRatio * resolvedDuration,
        duration: resolvedDuration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [applyVideoProgressRatio],
  );

  const updateVideoSeekFromClientX = useCallback(
    (clientX: number, track: HTMLDivElement | null) => {
      const ratio = getVideoProgressRatioFromClientX(clientX, track);
      if (ratio === null) return;

      videoSeekPreviewRatioRef.current = ratio;
      previewActiveVideoSeekToRatio(ratio);
    },
    [getVideoProgressRatioFromClientX, previewActiveVideoSeekToRatio],
  );

  const finishVideoProgressScrub = useCallback(
    (clientX?: number, track?: HTMLDivElement | null) => {
      const storedPreviewRatio = videoSeekPreviewRatioRef.current;
      const pointerRatio =
        storedPreviewRatio === null && typeof clientX === "number"
          ? getVideoProgressRatioFromClientX(clientX, track ?? null)
          : null;
      const finalRatio = storedPreviewRatio ?? pointerRatio;
      const shouldResumeVideo = wasVideoPlayingBeforeProgressScrubRef.current;

      videoSeekPreviewRatioRef.current = null;
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      setIsVideoProgressSeeking(false);

      if (finalRatio === null) {
        syncActiveVideoProgress();
        if (shouldResumeVideo) {
          playCurrentVideo();
        }
        return;
      }

      seekActiveVideoToRatio(finalRatio);
      syncActiveVideoProgress(undefined, {
        forceState: true,
      });

      if (shouldResumeVideo) {
        playCurrentVideo();
      }
    },
    [
      getVideoProgressRatioFromClientX,
      playCurrentVideo,
      seekActiveVideoToRatio,
      syncActiveVideoProgress,
    ],
  );

  const cancelVideoProgressScrub = useCallback(() => {
    const shouldResumeVideo = wasVideoPlayingBeforeProgressScrubRef.current;

    videoSeekPreviewRatioRef.current = null;
    isVideoProgressSeekingRef.current = false;
    wasVideoPlayingBeforeProgressScrubRef.current = false;
    setIsVideoProgressSeeking(false);
    syncActiveVideoProgress();

    if (shouldResumeVideo) {
      playCurrentVideo();
    }
  }, [playCurrentVideo, syncActiveVideoProgress]);

  const handleVideoProgressPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      if (!event.isPrimary || !shouldShowVideo || isSearchFocused) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressScrubRef.current = !currentVideo.paused && !currentVideo.ended;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      updateVideoSeekFromClientX(event.clientX, event.currentTarget);
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      registerSwipeHintInteraction,
      shouldShowVideo,
      updateVideoSeekFromClientX,
    ],
  );

  const handleVideoProgressPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      event.preventDefault();
      updateVideoSeekFromClientX(event.clientX, event.currentTarget);
    },
    [isSearchFocused, updateVideoSeekFromClientX],
  );

  const handleVideoProgressPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (event.type === "pointercancel") {
        cancelVideoProgressScrub();
        return;
      }

      finishVideoProgressScrub(event.clientX, event.currentTarget);
    },
    [cancelVideoProgressScrub, finishVideoProgressScrub],
  );

  const shouldUseTouchProgressFallback = useCallback(
    () => typeof window !== "undefined" && !("PointerEvent" in window),
    [],
  );

  const handleVideoProgressTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      if (!shouldShowVideo || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      registerSwipeHintInteraction();
      cancelPendingVideoGestureTimers();

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo) return;

      wasVideoPlayingBeforeProgressScrubRef.current = !currentVideo.paused && !currentVideo.ended;
      currentVideo.pause();
      setIsVideoPaused(true);
      isVideoProgressSeekingRef.current = true;
      setIsVideoProgressSeeking(true);
      updateVideoSeekFromClientX(touch.clientX, event.currentTarget);
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      registerSwipeHintInteraction,
      shouldShowVideo,
      shouldUseTouchProgressFallback,
      updateVideoSeekFromClientX,
    ],
  );

  const handleVideoProgressTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;
      if (!isVideoProgressSeekingRef.current || isSearchFocused) return;

      const touch = event.touches[0];
      if (!touch) return;

      event.preventDefault();
      updateVideoSeekFromClientX(touch.clientX, event.currentTarget);
    },
    [isSearchFocused, shouldUseTouchProgressFallback, updateVideoSeekFromClientX],
  );

  const handleVideoProgressTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      if (!shouldUseTouchProgressFallback()) return;

      event.preventDefault();
      if (event.type === "touchcancel") {
        cancelVideoProgressScrub();
        return;
      }

      const touch = event.changedTouches[0];
      finishVideoProgressScrub(touch?.clientX, event.currentTarget);
    },
    [cancelVideoProgressScrub, finishVideoProgressScrub, shouldUseTouchProgressFallback],
  );

  const handleVideoProgressKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (isSearchFocused) return;

      const currentVideo = backgroundVideoRef.current;
      if (!currentVideo || !shouldShowVideo) return;

      const duration = getReadableVideoDuration(currentVideo) || videoProgress.duration;
      if (!duration) return;

      const step = Math.min(5, Math.max(1, duration * 0.05));
      let nextTime: number | null = null;

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextTime = currentVideo.currentTime - step;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextTime = currentVideo.currentTime + step;
      }

      if (event.key === "Home") {
        nextTime = 0;
      }

      if (event.key === "End") {
        nextTime = duration;
      }

      if (nextTime === null) return;

      event.preventDefault();
      event.stopPropagation();
      cancelPendingVideoGestureTimers();
      seekActiveVideoToTime(nextTime);
      syncActiveVideoProgress();
    },
    [
      cancelPendingVideoGestureTimers,
      isSearchFocused,
      seekActiveVideoToTime,
      shouldShowVideo,
      syncActiveVideoProgress,
      videoProgress.duration,
    ],
  );

  const shouldRenderSwipeHint =
    hasLoadedSwipeHintPreference &&
    !hasSeenSwipeHint &&
    showSwipeHint &&
    canSwipeBetweenPsychologists &&
    !isUiHidden &&
    !isFiltersOpen &&
    !isSearchFocused &&
    !showInitialLoading &&
    !errorMessage;
  const shouldRenderGlobalControls =
    !showInitialLoading && !errorMessage && psychologists.length > 0;
  const shouldRenderMobileGlobalControls = false;
  const shouldRenderDesktopFeedControls = false;
  const areFeedModeControlsHidden = isUiHidden || isFiltersOpen;
  const feedModeControlsVisibilityClass = areFeedModeControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";
  const areGlobalControlsHidden = isUiHidden || isFiltersOpen;
  const globalControlsVisibilityClass = areGlobalControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";
  const areDesktopFeedControlsHidden = isFiltersOpen;
  const desktopFeedControlsVisibilityClass = areDesktopFeedControlsHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";
  const desktopActionPsychologist = featuredPsychologist;
  const desktopActionIsFavorited = desktopActionPsychologist
    ? (favoriteOverrides[desktopActionPsychologist.id] ??
      Boolean(desktopActionPsychologist.favorited))
    : false;
  const desktopActionIsFavoritePending = desktopActionPsychologist
    ? favoritePendingId === desktopActionPsychologist.id
    : false;
  const shouldRenderDesktopActionRail =
    metrics.isDesktopLayout && shouldRenderGlobalControls && Boolean(desktopActionPsychologist);
  const shouldRenderDesktopNavigationRail =
    metrics.isDesktopLayout && shouldRenderGlobalControls && psychologists.length > 1;
  const canNavigateToPreviousPsychologist = activePsychologistIndex > 0;
  const canNavigateToNextPsychologist = activePsychologistIndex < psychologists.length - 1;
  const isDesktopActionRailHidden = isFiltersOpen;
  const desktopActionRailVisibilityClass = isDesktopActionRailHidden
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";
  const shouldRenderDesktopControlRail =
    shouldRenderDesktopActionRail && Boolean(desktopActionPsychologist);

  useEffect(() => {
    if (!activeOnboardingTip) return;
    if (!isFiltersOpen && !isSearchFocused && !showInitialLoading && !errorMessage) return;

    const timeout = window.setTimeout(() => {
      setActiveOnboardingTip(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeOnboardingTip, errorMessage, isFiltersOpen, isSearchFocused, showInitialLoading]);

  useEffect(() => {
    if (hasShownOnboardingTipThisVisitRef.current) return;
    if (!accountTipsUserId) return;
    if (!hasLoadedSwipeHintPreference) return;
    if (!accountTips.onboardingTips.isSuccess) return;
    if (accountTips.onboardingTips.isPending) return;
    if (activeOnboardingTip) return;
    if (!shouldRenderGlobalControls || isFiltersOpen || isSearchFocused || isUiHidden) return;

    const tips = accountTips.onboardingTips.data;
    const hasSeenDiscoverTip = Boolean(tips?.has_seen_discover_psychologists_tip);
    const hasSeenMySearchTip =
      hasPersistedMySearchTipSeenRef.current || Boolean(tips?.has_seen_psychologists_my_search_tip);
    const hasSeenWhatsappTip =
      hasPersistedWhatsappTipSeenRef.current || Boolean(tips?.has_seen_psychologist_whatsapp_tip);
    const nextTip: PsychologistsOnboardingTip | null = !hasSeenDiscoverTip
      ? null
      : !hasSeenMySearchTip
        ? "mySearch"
        : !hasSeenWhatsappTip && featuredPsychologist?.whatsapp_url
          ? "whatsapp"
          : null;

    if (!nextTip) return;

    const timeout = window.setTimeout(() => {
      if (hasShownOnboardingTipThisVisitRef.current) return;

      hasShownOnboardingTipThisVisitRef.current = true;
      setActiveOnboardingTip(nextTip);

      if (nextTip === "mySearch") {
        persistMySearchTipSeen();
      } else {
        persistWhatsappTipSeen();
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [
    accountTips.onboardingTips.data,
    accountTips.onboardingTips.isPending,
    accountTips.onboardingTips.isSuccess,
    accountTipsUserId,
    activeOnboardingTip,
    featuredPsychologist?.whatsapp_url,
    hasLoadedSwipeHintPreference,
    isFiltersOpen,
    isSearchFocused,
    isUiHidden,
    persistMySearchTipSeen,
    persistWhatsappTipSeen,
    shouldRenderGlobalControls,
  ]);

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="h-[100dvh] max-w-none overflow-hidden p-0 sm:p-0 lg:pb-0"
      desktopNavigation="sidebar"
      desktopSidebarSurface="flat"
      navigationDimmed={isMobileSearchFocusMode}
      navigationHidden={metrics.isDesktopLayout ? false : isUiHidden}
      navigationTheme="solidWhite"
    >
      <style>
        {`
          @keyframes psychologists-double-tap-feedback {
            0% {
              opacity: 0;
              transform: translate3d(-50%, -50%, 0) scale(0.72);
            }
            22% {
              opacity: 1;
              transform: translate3d(-50%, -50%, 0) scale(1.12);
            }
            100% {
              opacity: 0;
              transform: translate3d(-50%, -50%, 0) scale(1.38);
            }
          }

          @keyframes psychologists-swipe-hint-float {
            0%,
            100% {
              transform: translate3d(-50%, 0, 0);
            }
            50% {
              transform: translate3d(-50%, -6px, 0);
            }
          }

          @keyframes psychologists-swipe-hint-enter {
            0% {
              opacity: 0;
              transform: translate3d(-50%, 8px, 0) scale(0.96);
            }
            100% {
              opacity: 1;
              transform: translate3d(-50%, 0, 0) scale(1);
            }
          }

          @keyframes psychologists-swipe-card-nudge {
            0%,
            100% {
              transform: translate3d(0, 0, 0);
            }
            45% {
              transform: translate3d(0, -8px, 0);
            }
          }

          @keyframes psychologists-availability-dot-pulse {
            0%,
            100% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
              opacity: 1;
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.22);
              opacity: 0.92;
              transform: scale(1.18);
            }
          }

          .psychologists-video-feed {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
            scrollbar-width: none;
          }

          .psychologists-video-feed::-webkit-scrollbar {
            display: none;
          }

          .psychologists-filter-dialog-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .psychologists-filter-dialog-scroll::-webkit-scrollbar {
            display: none;
          }

          @media (min-width: 1024px) {
            .psychologists-shorts-layout {
              --psychologists-desktop-card-top: 10px;
              --psychologists-desktop-card-gap: 6px;
              --psychologists-desktop-card-height: min(900px, calc(100dvh - 82px));
              --psychologists-desktop-card-width: min(506px, calc(56.25dvh - 46.125px));
              --psychologists-desktop-card-half-width: min(253px, calc(28.125dvh - 23.0625px));
              --psychologists-desktop-rail-left: calc(
                50% +
                var(--psychologists-desktop-card-half-width) +
                28px
              );
              --psychologists-desktop-slide-height: calc(
                var(--psychologists-desktop-card-top) +
                var(--psychologists-desktop-card-height) +
                var(--psychologists-desktop-card-gap)
              );
            }

            .psychologists-video-feed {
              scroll-padding-top: 0;
            }
          }

          .psychologists-double-tap-feedback {
            animation: psychologists-double-tap-feedback 520ms ease-out both;
          }

          .psychologists-swipe-hint {
            animation:
              psychologists-swipe-hint-enter 220ms ease-out both,
              psychologists-swipe-hint-float 1.4s 220ms ease-in-out infinite;
          }

          .psychologists-swipe-nudge {
            animation: psychologists-swipe-card-nudge 760ms cubic-bezier(0.2, 0.85, 0.2, 1) both;
          }

          .psychologists-availability-dot {
            animation: psychologists-availability-dot-pulse 1.6s ease-in-out infinite;
            will-change: box-shadow, opacity, transform;
          }

          .psychologists-ui-inert,
          .psychologists-ui-inert * {
            pointer-events: none !important;
          }

          @media (prefers-reduced-motion: reduce) {
            .psychologists-video-feed {
              scroll-behavior: auto;
            }

            .psychologists-double-tap-feedback {
              animation: none;
              opacity: 1;
            }

            .psychologists-swipe-hint,
            .psychologists-swipe-nudge {
              animation: none;
            }

            .psychologists-availability-dot {
              animation: none;
              box-shadow: none;
              opacity: 1;
              transform: none;
            }
          }
        `}
      </style>
      <div
        className="psychologists-shorts-layout relative isolate h-[100dvh] min-h-[100dvh] overflow-hidden bg-background text-white lg:bg-[#f8fafc] lg:touch-pan-y"
        onTouchCancel={handleDesktopPageTouchEnd}
        onTouchEnd={handleDesktopPageTouchEnd}
        onTouchMove={handleDesktopPageTouchMove}
        onTouchStart={handleDesktopPageTouchStart}
        onWheelCapture={handleDesktopPageWheelCapture}
      >
        <div className="relative mx-auto flex h-[100dvh] w-full max-w-[430px] justify-center overflow-hidden bg-black lg:max-w-none lg:items-start lg:gap-0 lg:bg-transparent lg:px-8">
          <div className="relative z-20 h-full w-full overflow-hidden bg-black lg:h-[100dvh] lg:w-[var(--psychologists-desktop-card-width)] lg:shrink-0 lg:overflow-visible lg:bg-transparent">
            {showInitialLoading ? (
              <div className="grid h-full place-items-center bg-[#F8FAFC] px-4 text-foreground">
                <LoadingState label="Carregando Psicólogos" />
              </div>
            ) : null}

            {errorMessage ? (
              <InlineAlert className="mt-10" title="Não foi possível carregar" variant="error">
                {errorMessage}
              </InlineAlert>
            ) : null}

            {!showInitialLoading && !errorMessage && psychologists.length === 0 ? (
              <div className="grid h-full w-full place-items-center px-4 py-8">
                <EmptyState
                  className="w-full"
                  description="Ainda não existem psicólogos publicados com vídeo de apresentação para estes filtros."
                  icon={UsersRound}
                  title="Nenhum Psicólogo encontrado"
                  action={
                    hasActiveFilters ? (
                      <button
                        aria-label="Limpar filtros"
                        className="mt-3 rounded-full bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16a34a]"
                        onClick={clearFilters}
                        type="button"
                      >
                        Limpar filtros
                      </button>
                    ) : null
                  }
                />
              </div>
            ) : null}

            {shouldRenderGlobalControls ? (
              <div
                aria-hidden={areFeedModeControlsHidden ? true : undefined}
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-[76] bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-5 pt-[calc(env(safe-area-inset-top)+20px)] transition-all duration-200 ease-out lg:hidden lg:top-[var(--psychologists-desktop-card-top)] lg:bg-none",
                  metrics.isDesktopLayout ? "lg:rounded-t-[22px] lg:px-5" : null,
                  feedModeControlsVisibilityClass,
                )}
                data-psychologists-scroll-lock="true"
                onMouseDown={stopInteractionPropagation}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  registerSwipeHintInteraction();
                }}
              >
                <div className="pointer-events-auto flex items-center justify-center gap-8 text-white">
                  <button
                    aria-current={!hasActiveFilters ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center justify-center px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                      hasActiveFilters ? "opacity-70 hover:opacity-100" : "opacity-100",
                    )}
                    onClick={handleExploreModeClick}
                    tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    Explorar
                    {!hasActiveFilters ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-white"
                      />
                    ) : null}
                  </button>

                  <button
                    aria-current={hasActiveFilters ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center justify-center gap-1.5 px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                      hasActiveFilters ? "opacity-100" : "opacity-75 hover:opacity-100",
                    )}
                    data-psychologists-tip-target="my-search"
                    onClick={handleMySearchModeClick}
                    tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    <span>Minha Busca</span>
                    <Search className="h-[17px] w-[17px]" aria-hidden="true" strokeWidth={2.25} />
                    {hasActiveFilters ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white"
                      />
                    ) : null}
                  </button>
                </div>

                {hasActiveFilters && activeFilterChips.length > 0 ? (
                  <div className="pointer-events-auto -mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-5 lg:px-5">
                    <div className="flex min-w-max items-center justify-center gap-2">
                      {activeFilterChips.map((chip) => (
                        <button
                          aria-label={`Remover filtro ${chip.label}`}
                          className="inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-white/20 bg-white/16 px-3 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(15,23,42,0.22)] backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/24"
                          key={`${chip.key}-${chip.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveActiveFilter(chip.key);
                          }}
                          tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                          type="button"
                        >
                          <span className="truncate">{chip.label}</span>
                          <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      ))}

                      <button
                        className="inline-flex h-8 shrink-0 items-center rounded-full border border-white/25 bg-white px-3 text-xs font-bold text-[#0f172a] shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-transform duration-150 ease-out hover:scale-[1.02]"
                        onClick={handleMySearchModeClick}
                        tabIndex={areFeedModeControlsHidden ? -1 : undefined}
                        type="button"
                      >
                        + Filtros
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {shouldRenderMobileGlobalControls ? (
              <>
                {isSearchFocused ? (
                  <button
                    aria-label="Fechar busca"
                    className="absolute inset-0 z-[60] cursor-default bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ease-out"
                    data-psychologists-scroll-lock="true"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      exitSearchMode();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      exitSearchMode();
                    }}
                    onWheel={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    type="button"
                  />
                ) : null}

                <form
                  aria-hidden={areGlobalControlsHidden ? true : undefined}
                  className={cn(
                    "absolute z-[70] transition-all duration-200 ease-out",
                    globalControlsVisibilityClass,
                    isSearchFocused ? "scale-[1.015]" : null,
                  )}
                  data-psychologists-scroll-lock="true"
                  onMouseDown={stopInteractionPropagation}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    registerSwipeHintInteraction();
                  }}
                  onSubmit={handleSearchSubmit}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    left: `${metrics.horizontalPadding}px`,
                    right: `${metrics.searchRightGap}px`,
                    height: `${metrics.searchHeight}px`,
                  }}
                >
                  <div
                    className={cn(
                      "relative flex h-full w-full items-center rounded-[999px] border p-3 backdrop-blur-md transition-all duration-200 ease-out",
                      isSearchFocused
                        ? "border-white/80 bg-white/[0.92] shadow-[0_18px_46px_rgba(15,23,42,0.28)]"
                        : "border-[rgba(255,255,255,0.35)] bg-white/35",
                    )}
                  >
                    <Search
                      className={cn(
                        "absolute left-3 h-4 w-4 transition-colors",
                        isSearchFocused ? "text-[#64748b]" : "text-white/85",
                      )}
                      aria-hidden="true"
                    />
                    <input
                      aria-label="Buscar Psicólogos"
                      className={cn(
                        "h-full w-full bg-transparent pr-3 pl-7 text-[14px] outline-none transition-colors",
                        isSearchFocused
                          ? "text-[#0f172a] placeholder:text-[#64748b]"
                          : "text-white placeholder:text-white/72",
                      )}
                      maxLength={120}
                      disabled={areGlobalControlsHidden}
                      onBlur={() => {
                        window.setTimeout(() => exitSearchMode({ shouldBlur: false }), 120);
                      }}
                      onChange={(event) => {
                        setSearchDraft(event.target.value);
                        enterSearchMode();
                      }}
                      onFocus={enterSearchMode}
                      placeholder="Buscar psicólogos"
                      name="search"
                      ref={searchInputRef}
                      tabIndex={areGlobalControlsHidden ? -1 : undefined}
                      type="text"
                      value={searchDraft}
                    />
                  </div>

                  {shouldRenderSearchSuggestions ? (
                    <div
                      aria-label="Sugestões de psicólogos"
                      className="absolute top-[calc(100%+8px)] right-0 left-0 overflow-hidden rounded-2xl border border-white/25 bg-white/95 text-[#0f172a] shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-md"
                      onMouseDown={(event) => event.preventDefault()}
                      role="listbox"
                    >
                      <div className="border-[#e2e8f0] border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#64748b] uppercase">
                        Profissionais cadastrados
                      </div>
                      {searchSuggestionsDirectory.isFetching ? (
                        <div className="px-3 py-3 text-sm font-medium text-[#64748b]">
                          Buscando profissionais...
                        </div>
                      ) : (
                        searchSuggestionItems.map((suggestion) => (
                          <button
                            aria-label={`Buscar por ${suggestion.name}`}
                            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition hover:bg-[#f8fafc]"
                            key={suggestion.id}
                            aria-selected={false}
                            onClick={() => handleSearchSuggestionSelect(suggestion.name)}
                            role="option"
                            type="button"
                          >
                            <span className="min-w-0 truncate">{suggestion.name}</span>
                            <span className="shrink-0 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold text-[#308ce8]">
                              {suggestion.verified ? "Verificado" : "Gratuito"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </form>

                <button
                  aria-label="Abrir filtros"
                  aria-hidden={areGlobalControlsHidden ? true : undefined}
                  className={cn(
                    "absolute z-[70] grid items-center justify-center rounded-full border shadow-[0_5px_24px_rgba(15,23,42,0.2)] backdrop-blur-md transition hover:bg-white/45",
                    globalControlsVisibilityClass,
                    isSearchFocused
                      ? "border-white/80 bg-white/[0.92] text-[#0f172a] shadow-[0_18px_46px_rgba(15,23,42,0.24)]"
                      : "border-[rgba(255,255,255,0.35)] bg-white/35 text-white",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFiltersOpen();
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (isSearchFocused) {
                      exitSearchMode({
                        resumeVideo: false,
                      });
                    }
                    registerSwipeHintInteraction();
                  }}
                  style={{
                    top: `calc(env(safe-area-inset-top) + ${metrics.searchTop}px)`,
                    right: `${metrics.actionRightPadding}px`,
                    width: `${metrics.filterButtonSize}px`,
                    height: `${metrics.filterButtonSize}px`,
                  }}
                  disabled={areGlobalControlsHidden}
                  tabIndex={areGlobalControlsHidden ? -1 : undefined}
                  type="button"
                >
                  <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </>
            ) : null}

            {!showInitialLoading && !errorMessage && psychologists.length > 0 ? (
              <div
                className={cn(
                  "psychologists-video-feed h-full w-full snap-y snap-mandatory overscroll-contain lg:h-[100dvh]",
                  isSearchFocused || isVideoProgressSeeking ? "overflow-hidden" : "overflow-y-auto",
                )}
                onPointerDownCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
                onScroll={isSearchFocused ? undefined : handleFeedScroll}
                onWheelCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
                ref={feedContainerRef}
              >
                {psychologists.map((psychologist, index) => {
                  const isActiveSlide = index === activePsychologistIndex;
                  const slideVideoSrc = resolvePublicMediaUrl(psychologist.video_url);
                  const slidePosterSrc = psychologist.video_cover_url
                    ? resolvePublicMediaUrl(psychologist.video_cover_url)
                    : null;
                  const slideShouldShowVideo =
                    Boolean(slideVideoSrc) && (!isActiveSlide || !isVideoPlaybackFailed);
                  const slideShouldRenderProgress =
                    Boolean(slideVideoSrc) &&
                    (!metrics.isDesktopLayout || isActiveSlide) &&
                    (!isActiveSlide || slideShouldShowVideo);
                  const slideBio = psychologist.headline?.trim() || "";
                  const slideNameParts = splitNameForBadge(psychologist.name);
                  const slideBenefitChips = buildBenefitChips(psychologist);
                  const slideIsFavorited =
                    favoriteOverrides[psychologist.id] ?? Boolean(psychologist.favorited);
                  const slideIsFavoritePending = favoritePendingId === psychologist.id;
                  const slideActionColumnTranslateY = isActiveSlide ? actionColumnTranslateY : 0;
                  const slideIsUiHidden = isActiveSlide && isUiHidden;
                  const slideShouldHideChrome =
                    slideIsUiHidden || (metrics.isDesktopLayout && !isActiveSlide);
                  const slideUiVisibilityClass = slideShouldHideChrome
                    ? "psychologists-ui-inert pointer-events-none opacity-0"
                    : "opacity-100";
                  const slideOverlayVisibilityClass = slideShouldHideChrome
                    ? "opacity-0"
                    : "opacity-100";
                  const slideProgressRatio =
                    isActiveSlide && videoProgress.duration
                      ? clampNumber(videoProgress.currentTime / videoProgress.duration, 0, 1)
                      : 0;
                  const slideProgressBottom = slideIsUiHidden
                    ? `calc(env(safe-area-inset-bottom) + ${VIDEO_IMMERSIVE_PROGRESS_CONTROLS_OFFSET}px)`
                    : metrics.navBarHeight > 0
                      ? `calc(${VIDEO_PROGRESS_VISIBLE_NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom) - ${VIDEO_PROGRESS_NAVBAR_OVERLAP_PX}px)`
                      : "0px";
                  const slideCanSeekProgress =
                    isActiveSlide && slideShouldShowVideo && slideIsUiHidden;
                  const slideVideoAreaLabel =
                    isActiveSlide &&
                    slideShouldShowVideo &&
                    (isVideoMuted || videoVolume <= 0 || isVideoPaused)
                      ? `Ativar som e reproduzir vÃ­deo de ${psychologist.name}`
                      : slideIsUiHidden
                        ? `Mostrar interface de ${psychologist.name}`
                        : `Ocultar interface de ${psychologist.name}`;

                  return (
                    <section
                      aria-label={`Psicólogo ${psychologist.name}`}
                      className={cn(
                        "relative h-[100dvh] w-full snap-start snap-always overflow-hidden lg:h-[var(--psychologists-desktop-slide-height)] lg:overflow-visible",
                        isActiveSlide && shouldNudgeSwipeCard ? "psychologists-swipe-nudge" : null,
                      )}
                      data-psychologists-slide-index={index}
                      key={psychologist.id}
                    >
                      <div className="absolute inset-0 overflow-hidden lg:inset-x-0 lg:top-[var(--psychologists-desktop-card-top)] lg:bottom-auto lg:h-[var(--psychologists-desktop-card-height)] lg:rounded-[22px] lg:bg-black">
                        <div className="relative h-full w-full overflow-hidden">
                          {shouldRenderGlobalControls ? (
                            <div
                              aria-hidden={
                                !isActiveSlide || areFeedModeControlsHidden ? true : undefined
                              }
                              className={cn(
                                "pointer-events-none absolute inset-x-0 top-0 z-[76] hidden bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-5 pt-[calc(env(safe-area-inset-top)+20px)] transition-all duration-200 ease-out lg:block lg:rounded-t-[22px] lg:bg-none",
                                isActiveSlide
                                  ? feedModeControlsVisibilityClass
                                  : "psychologists-ui-inert pointer-events-none opacity-0",
                              )}
                              data-psychologists-scroll-lock="true"
                              onMouseDown={stopInteractionPropagation}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                registerSwipeHintInteraction();
                              }}
                            >
                              <div className="pointer-events-auto flex items-center justify-center gap-8 text-white">
                                <button
                                  aria-current={!hasActiveFilters ? "page" : undefined}
                                  className={cn(
                                    "relative inline-flex h-9 items-center justify-center px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                                    hasActiveFilters
                                      ? "opacity-70 hover:opacity-100"
                                      : "opacity-100",
                                  )}
                                  onClick={handleExploreModeClick}
                                  tabIndex={
                                    !isActiveSlide || areFeedModeControlsHidden ? -1 : undefined
                                  }
                                  type="button"
                                >
                                  Explorar
                                  {!hasActiveFilters ? (
                                    <span
                                      aria-hidden="true"
                                      className="absolute -bottom-0.5 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-white"
                                    />
                                  ) : null}
                                </button>

                                <button
                                  aria-current={hasActiveFilters ? "page" : undefined}
                                  className={cn(
                                    "relative inline-flex h-9 items-center justify-center gap-1.5 px-1 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity duration-150 ease-out",
                                    hasActiveFilters
                                      ? "opacity-100"
                                      : "opacity-75 hover:opacity-100",
                                  )}
                                  data-psychologists-tip-target={
                                    isActiveSlide ? "my-search" : undefined
                                  }
                                  onClick={handleMySearchModeClick}
                                  tabIndex={
                                    !isActiveSlide || areFeedModeControlsHidden ? -1 : undefined
                                  }
                                  type="button"
                                >
                                  <span>Minha Busca</span>
                                  <Search
                                    className="h-[17px] w-[17px]"
                                    aria-hidden="true"
                                    strokeWidth={2.25}
                                  />
                                  {hasActiveFilters ? (
                                    <span
                                      aria-hidden="true"
                                      className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-white"
                                    />
                                  ) : null}
                                </button>
                              </div>

                              {hasActiveFilters && activeFilterChips.length > 0 ? (
                                <div className="pointer-events-auto -mx-5 mt-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                  <div className="flex min-w-max items-center justify-center gap-2">
                                    {activeFilterChips.map((chip) => (
                                      <button
                                        aria-label={`Remover filtro ${chip.label}`}
                                        className="inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full border border-white/20 bg-white/16 px-3 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(15,23,42,0.22)] backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/24"
                                        key={`${psychologist.id}-${chip.key}-${chip.label}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleRemoveActiveFilter(chip.key);
                                        }}
                                        tabIndex={
                                          !isActiveSlide || areFeedModeControlsHidden
                                            ? -1
                                            : undefined
                                        }
                                        type="button"
                                      >
                                        <span className="truncate">{chip.label}</span>
                                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                      </button>
                                    ))}

                                    <button
                                      className="inline-flex h-8 shrink-0 items-center rounded-full border border-white/25 bg-white px-3 text-xs font-bold text-[#0f172a] shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-transform duration-150 ease-out hover:scale-[1.02]"
                                      onClick={handleMySearchModeClick}
                                      tabIndex={
                                        !isActiveSlide || areFeedModeControlsHidden ? -1 : undefined
                                      }
                                      type="button"
                                    >
                                      + Filtros
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {slideShouldShowVideo ? (
                            <video
                              aria-label={`Vídeo de apresentação de ${psychologist.name}`}
                              data-psychologist-id={psychologist.id}
                              data-psychologists-background="true"
                              autoPlay={isActiveSlide && !isVideoPaused}
                              className="h-full w-full bg-black object-cover"
                              controls={false}
                              loop
                              muted={isVideoMuted}
                              onDurationChange={(event) => {
                                if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                              }}
                              onError={() => {
                                if (isActiveSlide) setIsVideoPlaybackFailed(true);
                              }}
                              onLoadedData={() => {
                                if (!isActiveSlide) return;

                                setIsVideoPlaybackFailed(false);
                                setIsVideoPaused(false);
                                syncActiveVideoProgress();
                              }}
                              onLoadedMetadata={(event) => {
                                if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                              }}
                              onPause={(event) => {
                                if (!isActiveSlide) return;

                                setIsVideoPaused(true);
                                syncActiveVideoProgress();
                                flushFeedVideoAnalytics(event.currentTarget, {
                                  force: true,
                                });
                              }}
                              onPlay={() => {
                                if (!isActiveSlide) return;

                                setIsVideoPaused(false);
                                syncActiveVideoProgress();
                              }}
                              onRateChange={(event) => {
                                if (!isActiveSlide) return;

                                setVideoPlaybackRate(event.currentTarget.playbackRate);
                              }}
                              onTimeUpdate={(event) => {
                                if (!isActiveSlide) return;

                                syncActiveVideoProgress(event.currentTarget);
                                flushFeedVideoAnalytics(event.currentTarget);
                              }}
                              onVolumeChange={(event) => {
                                if (!isActiveSlide) return;

                                setIsVideoMuted(event.currentTarget.muted);
                                setVideoVolume(event.currentTarget.volume);
                              }}
                              playsInline
                              poster={slidePosterSrc || undefined}
                              preload={isActiveSlide ? "auto" : "metadata"}
                              ref={(node) => {
                                if (isActiveSlide) {
                                  backgroundVideoRef.current = node;
                                } else if (
                                  backgroundVideoRef.current?.dataset.psychologistId ===
                                  psychologist.id
                                ) {
                                  backgroundVideoRef.current = null;
                                }
                              }}
                              src={slideVideoSrc ?? undefined}
                            />
                          ) : slidePosterSrc ? (
                            <Image
                              alt={psychologist.name}
                              className="h-full w-full object-cover"
                              fill
                              priority={index === 0}
                              sizes="(min-width: 768px) 430px, 100vw"
                              src={slidePosterSrc}
                              unoptimized={isPublicMediaUrl(psychologist.video_cover_url)}
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-[#e2e8f0] text-3xl font-extrabold text-[#94a3b8]">
                              {getInitials(psychologist.name)}
                            </div>
                          )}

                          <div
                            className={cn(
                              "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
                              slideOverlayVisibilityClass,
                            )}
                            style={{
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.7) 17%, rgba(0,0,0,0.42) 31%, rgba(0,0,0,0.16) 43%, rgba(0,0,0,0) 58%)",
                            }}
                          />

                          <button
                            aria-label={slideVideoAreaLabel}
                            className="absolute inset-0 z-10 h-full w-full cursor-default border-0 bg-transparent p-0"
                            onClick={
                              isActiveSlide
                                ? () => handleVideoAreaTap(psychologist, slideIsUiHidden)
                                : stopInteractionPropagation
                            }
                            onPointerCancel={isActiveSlide ? handleLongPressEnd : undefined}
                            onPointerDown={isActiveSlide ? handleLongPressStart : undefined}
                            onPointerLeave={isActiveSlide ? handleLongPressEnd : undefined}
                            onPointerMove={isActiveSlide ? handleLongPressMove : undefined}
                            onPointerUp={isActiveSlide ? handleLongPressEnd : undefined}
                            type="button"
                          />

                          {isActiveSlide &&
                          slideShouldShowVideo &&
                          !slideIsUiHidden &&
                          !isLongPressing &&
                          !isVideoProgressSeeking &&
                          (isVideoMuted || isVideoPaused) ? (
                            <button
                              aria-label={
                                isVideoPaused
                                  ? `Retomar vídeo de ${psychologist.name}`
                                  : `Ativar som do vídeo de ${psychologist.name}`
                              }
                              className="absolute top-1/2 left-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-black/40"
                              onClick={handleVideoControlTap}
                              type="button"
                            >
                              {isVideoPaused ? (
                                <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
                              ) : isVideoMuted ? (
                                <VolumeX className="h-5 w-5" aria-hidden="true" />
                              ) : null}
                            </button>
                          ) : null}

                          {slideShouldRenderProgress ? (
                            <div
                              aria-label={`Progresso do vídeo de ${psychologist.name}`}
                              aria-valuemax={isActiveSlide ? Math.round(videoProgress.duration) : 0}
                              aria-valuemin={0}
                              aria-valuenow={
                                isActiveSlide ? Math.round(videoProgress.currentTime) : 0
                              }
                              className={cn(
                                "absolute z-50 flex h-6 items-end outline-none",
                                slideCanSeekProgress
                                  ? "pointer-events-auto cursor-pointer"
                                  : "pointer-events-none",
                              )}
                              data-psychologists-scroll-lock="true"
                              onClick={
                                slideCanSeekProgress ? stopInteractionPropagation : undefined
                              }
                              onKeyDown={
                                slideCanSeekProgress ? handleVideoProgressKeyDown : undefined
                              }
                              onPointerCancel={
                                slideCanSeekProgress ? handleVideoProgressPointerEnd : undefined
                              }
                              onPointerDown={
                                slideCanSeekProgress ? handleVideoProgressPointerDown : undefined
                              }
                              onPointerMove={
                                slideCanSeekProgress ? handleVideoProgressPointerMove : undefined
                              }
                              onPointerUp={
                                slideCanSeekProgress ? handleVideoProgressPointerEnd : undefined
                              }
                              onTouchCancel={
                                slideCanSeekProgress ? handleVideoProgressTouchEnd : undefined
                              }
                              onTouchEnd={
                                slideCanSeekProgress ? handleVideoProgressTouchEnd : undefined
                              }
                              onTouchMove={
                                slideCanSeekProgress ? handleVideoProgressTouchMove : undefined
                              }
                              onTouchStart={
                                slideCanSeekProgress ? handleVideoProgressTouchStart : undefined
                              }
                              ref={(node) => {
                                if (isActiveSlide) {
                                  progressTrackRef.current = node;
                                } else if (progressTrackRef.current === node) {
                                  progressTrackRef.current = null;
                                }
                              }}
                              role="slider"
                              style={{
                                bottom: slideProgressBottom,
                                left: 0,
                                right: 0,
                                touchAction: "none",
                              }}
                              tabIndex={slideCanSeekProgress ? 0 : -1}
                            >
                              <div
                                className="relative w-full overflow-hidden transition-[height] duration-150 ease-out"
                                style={{
                                  backgroundColor: VIDEO_PROGRESS_TRACK_COLOR,
                                  height: isActiveSlide && isVideoProgressSeeking ? "5px" : "3px",
                                }}
                              >
                                <div
                                  className={cn(
                                    "h-full origin-left",
                                    isActiveSlide && isVideoProgressSeeking
                                      ? null
                                      : "transition-transform duration-75 ease-linear",
                                  )}
                                  ref={(node) => {
                                    if (isActiveSlide) {
                                      progressFillRef.current = node;

                                      if (node) {
                                        node.style.transform = `scaleX(${slideProgressRatio})`;
                                      }
                                    } else if (progressFillRef.current === node) {
                                      progressFillRef.current = null;
                                    }
                                  }}
                                  style={{
                                    backgroundColor: VIDEO_PROGRESS_FILL_COLOR,
                                    transform: `scaleX(${slideProgressRatio})`,
                                    willChange: "transform",
                                    width: "100%",
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}

                          {isActiveSlide && slideShouldShowVideo && slideIsUiHidden ? (
                            <div
                              className="pointer-events-auto absolute inset-x-0 z-[60] flex items-center justify-between px-5"
                              data-psychologists-scroll-lock="true"
                              onPointerDown={stopInteractionPropagation}
                              style={{
                                bottom: `calc(env(safe-area-inset-bottom) + ${VIDEO_IMMERSIVE_CONTROLS_BOTTOM_GAP}px)`,
                              }}
                            >
                              <button
                                aria-label="Sair do modo imersivo"
                                className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/55 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-black/65 active:scale-95"
                                onClick={handleImmersiveExit}
                                type="button"
                              >
                                <X className="h-6 w-6" aria-hidden="true" strokeWidth={2.3} />
                              </button>

                              <div className="inline-flex h-12 items-center gap-1 rounded-full border border-white/10 bg-black/55 px-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md">
                                <button
                                  aria-label={isVideoPaused ? "Reproduzir vídeo" : "Pausar vídeo"}
                                  className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
                                  onClick={handleImmersivePlaybackToggle}
                                  type="button"
                                >
                                  {isVideoPaused ? (
                                    <Play
                                      className="ml-0.5 h-5 w-5"
                                      aria-hidden="true"
                                      strokeWidth={2.4}
                                    />
                                  ) : (
                                    <Pause
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                      strokeWidth={2.4}
                                    />
                                  )}
                                </button>

                                <span aria-hidden="true" className="h-6 w-px bg-white/18" />

                                <button
                                  aria-label={isVideoMuted ? "Ativar som" : "Silenciar vídeo"}
                                  className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
                                  onClick={handleImmersiveMuteToggle}
                                  type="button"
                                >
                                  {isVideoMuted ? (
                                    <VolumeX
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                      strokeWidth={2.4}
                                    />
                                  ) : (
                                    <Volume2
                                      className="h-5 w-5"
                                      aria-hidden="true"
                                      strokeWidth={2.4}
                                    />
                                  )}
                                </button>

                                <span aria-hidden="true" className="h-6 w-px bg-white/18" />

                                <button
                                  aria-label={`Alterar velocidade do vídeo. Atual: ${formatPlaybackRate(
                                    videoPlaybackRate,
                                  )}`}
                                  className="min-w-10 rounded-full px-2 py-2 text-[15px] leading-none font-semibold text-white/88 transition hover:bg-white/10 active:scale-95"
                                  onClick={handleImmersivePlaybackRateToggle}
                                  type="button"
                                >
                                  {formatPlaybackRate(videoPlaybackRate)}
                                </button>

                                <span aria-hidden="true" className="h-6 w-px bg-white/18" />

                                <button
                                  aria-label="Abrir vídeo em tela cheia"
                                  className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/10 active:scale-95"
                                  onClick={handleImmersiveFullscreen}
                                  type="button"
                                >
                                  <Maximize2
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                    strokeWidth={2.4}
                                  />
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <div
                            aria-hidden="true"
                            className={cn(
                              "pointer-events-auto absolute inset-x-0 z-[35] transition-opacity duration-200 ease-out",
                              slideUiVisibilityClass,
                            )}
                            style={{
                              bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom))`,
                              height: `${metrics.bioBottomOffset}px`,
                            }}
                          />

                          <section
                            aria-hidden={slideShouldHideChrome ? true : undefined}
                            aria-live={isActiveSlide && shareFeedback ? "polite" : "off"}
                            className={cn(
                              "pointer-events-none absolute inset-x-0 z-40 grid items-end text-[#ffffff] transition-opacity duration-200 ease-out",
                              slideUiVisibilityClass,
                            )}
                            style={{
                              left: `${metrics.horizontalPadding}px`,
                              right: `${metrics.actionRightPadding}px`,
                              bottom: infoSectionBottom,
                              columnGap: `${metrics.textColumnGap}px`,
                              gridTemplateColumns: `minmax(0, 1fr) ${metrics.actionRailWidth}px`,
                            }}
                          >
                            <div className="pointer-events-auto min-w-0">
                              {psychologist.available_today ? (
                                <div
                                  className="mb-1.5 flex w-fit items-center gap-1.5 font-semibold text-[#22C55E]"
                                  style={{
                                    fontSize: `${metrics.availableBadgeTextSize}px`,
                                    lineHeight: "12px",
                                  }}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="psychologists-availability-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]"
                                  />
                                  Disponível hoje
                                </div>
                              ) : null}

                              <div className="grid gap-1.5">
                                <button
                                  aria-label={`Ver perfil de ${psychologist.name}`}
                                  className="block w-full min-w-0 max-w-full cursor-pointer text-left font-bold text-white"
                                  disabled={slideShouldHideChrome}
                                  onClick={(event) =>
                                    navigateToPublicPsychologistProfile(psychologist.id, event)
                                  }
                                  tabIndex={slideShouldHideChrome ? -1 : undefined}
                                  type="button"
                                  style={{
                                    fontSize: `${metrics.titleSize}px`,
                                    fontWeight: 700,
                                    lineHeight: `${metrics.titleLineHeight}px`,
                                    maxWidth: "100%",
                                    overflowWrap: "break-word",
                                    wordBreak: "normal",
                                  }}
                                >
                                  {slideNameParts.firstPart ? (
                                    <span>{slideNameParts.firstPart} </span>
                                  ) : null}
                                  <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap align-baseline">
                                    <span>
                                      {slideNameParts.lastPart ||
                                        formatDisplayName(psychologist.name)}
                                    </span>
                                    {psychologist.verified ? (
                                      <VerifiedBadgeIcon
                                        aria-hidden="true"
                                        className="shrink-0 translate-y-[1px]"
                                        style={{
                                          height: `${metrics.verifiedBadgeSize}px`,
                                          width: `${metrics.verifiedBadgeSize}px`,
                                        }}
                                      />
                                    ) : null}
                                  </span>
                                </button>

                                <div
                                  className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 font-medium text-white/80"
                                  style={{
                                    fontSize: `${metrics.subtitleSize}px`,
                                    fontWeight: 500,
                                    lineHeight: "16px",
                                  }}
                                >
                                  <span className="min-w-0">
                                    {formatProfileTitle(
                                      psychologist.gender,
                                      psychologist.formation_years,
                                      psychologist.show_experience_tag,
                                    )}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 px-1 py-0 text-[#FDE68A] shadow-none backdrop-blur-[1px]">
                                    <Star
                                      aria-hidden="true"
                                      className="fill-[#FDE68A] opacity-85"
                                      style={{
                                        height: `${metrics.ratingIconSize}px`,
                                        width: `${metrics.ratingIconSize}px`,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: `${metrics.ratingTextSize}px`,
                                        fontWeight: 600,
                                        lineHeight: `${metrics.ratingLineHeight}px`,
                                      }}
                                    >
                                      {formatRating(
                                        psychologist.rating_avg,
                                        psychologist.rating_count,
                                      )}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {slideBio ? (
                                <p
                                  className="pointer-events-auto mt-2 w-full whitespace-pre-line text-left text-white/90"
                                  onPointerDown={stopInteractionPropagation}
                                  ref={(node) => {
                                    if (isActiveSlide && slideBenefitChips.length === 0) {
                                      bioTextRef.current = node;
                                    }
                                  }}
                                  style={{
                                    fontSize: `${metrics.bioSize}px`,
                                    lineHeight: `${metrics.bioLineHeight}px`,
                                    maxWidth: "100%",
                                    overflowWrap: "break-word",
                                    wordBreak: "normal",
                                  }}
                                >
                                  {slideBio}
                                </p>
                              ) : null}

                              {slideBenefitChips.length > 0 ? (
                                <ul
                                  aria-label="Benefícios do psicólogo"
                                  className="pointer-events-auto mt-2 flex max-w-full list-none flex-nowrap items-center gap-1 overflow-hidden p-0 min-[390px]:gap-1.5"
                                  onPointerDown={stopInteractionPropagation}
                                  ref={(node) => {
                                    if (isActiveSlide) {
                                      bioTextRef.current = node;
                                    }
                                  }}
                                >
                                  {slideBenefitChips.map((chip) => (
                                    <li
                                      className="inline-flex min-w-0 shrink items-center rounded-full border border-white/70 bg-black/15 px-1.5 py-1 text-[9px] leading-none font-bold whitespace-nowrap text-white/95 shadow-[0_4px_14px_rgba(15,23,42,0.2)] backdrop-blur-[2px] min-[390px]:px-2 min-[390px]:text-[10px]"
                                      key={chip.id}
                                    >
                                      <span className="truncate">{chip.label}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}

                              {isActiveSlide && shareFeedback ? (
                                <p
                                  aria-live="polite"
                                  className="mt-2 rounded-full bg-black/45 px-2 py-1 text-xs text-white"
                                >
                                  Link copiado
                                </p>
                              ) : null}
                            </div>

                            {!metrics.isDesktopLayout ? (
                              <div
                                className="pointer-events-auto relative z-50 flex flex-col items-center justify-self-end"
                                ref={(node) => {
                                  if (isActiveSlide) {
                                    actionColumnRef.current = node;
                                  }
                                }}
                                style={{
                                  gap: `${metrics.actionGap}px`,
                                  transform: `translateY(${slideActionColumnTranslateY}px)`,
                                  width: `${metrics.actionRailWidth}px`,
                                }}
                              >
                                <div className="grid justify-items-center text-center">
                                  <button
                                    aria-label={`Ver perfil de ${psychologist.name}`}
                                    className="grid place-items-center rounded-full bg-transparent transition active:scale-95"
                                    disabled={slideShouldHideChrome}
                                    onClick={(event) =>
                                      navigateToPublicPsychologistProfile(psychologist.id, event)
                                    }
                                    onPointerDown={stopInteractionPropagation}
                                    tabIndex={slideShouldHideChrome ? -1 : undefined}
                                    type="button"
                                    style={{
                                      width: `${metrics.actionHitSize}px`,
                                      height: `${metrics.actionHitSize}px`,
                                    }}
                                  >
                                    <div
                                      className="relative overflow-hidden rounded-full bg-white p-0.5 text-[#0f172a]"
                                      style={{
                                        width: `${metrics.actionAvatarSize}px`,
                                        height: `${metrics.actionAvatarSize}px`,
                                        border: "1.5px solid #fff",
                                      }}
                                    >
                                      {psychologist.avatar ? (
                                        <Image
                                          alt={psychologist.name}
                                          className="h-full w-full rounded-full object-cover"
                                          fill
                                          sizes={`${metrics.actionAvatarSize}px`}
                                          src={resolvePublicMediaUrl(psychologist.avatar) ?? ""}
                                          unoptimized={isPublicMediaUrl(psychologist.avatar)}
                                        />
                                      ) : (
                                        <span className="grid h-full w-full place-items-center rounded-full bg-[#e2e8f0] text-[10px] font-semibold text-[#334155]">
                                          {getInitials(psychologist.name)}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                </div>

                                <div className="grid justify-items-center text-center">
                                  <button
                                    aria-label={`Favoritar ${psychologist.name}`}
                                    aria-busy={slideIsFavoritePending}
                                    aria-pressed={slideIsFavorited}
                                    className={cn(
                                      "relative z-50 grid cursor-pointer place-items-center rounded-full bg-transparent text-white transition hover:bg-white/10 active:scale-95",
                                      slideIsFavorited ? "text-[#ef4444]" : "text-white",
                                    )}
                                    disabled={slideShouldHideChrome}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleFavorite(psychologist);
                                    }}
                                    tabIndex={slideShouldHideChrome ? -1 : undefined}
                                    style={{
                                      width: `${metrics.actionHitSize}px`,
                                      height: `${metrics.actionHitSize}px`,
                                    }}
                                    type="button"
                                  >
                                    <Heart
                                      className={cn("h-4 w-4")}
                                      aria-hidden="true"
                                      style={{
                                        height: `${metrics.actionStandaloneIconSize}px`,
                                        width: `${metrics.actionStandaloneIconSize}px`,
                                        color: slideIsFavorited ? "#ef4444" : "white",
                                        fill: slideIsFavorited ? "#ef4444" : "transparent",
                                      }}
                                    />
                                  </button>
                                </div>

                                <div className="grid justify-items-center text-center">
                                  <button
                                    aria-label={`Compartilhar perfil de ${psychologist.name}`}
                                    className="grid place-items-center rounded-full bg-transparent text-white transition hover:bg-white/10"
                                    disabled={slideShouldHideChrome}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void shareCurrent(psychologist);
                                    }}
                                    tabIndex={slideShouldHideChrome ? -1 : undefined}
                                    type="button"
                                    style={{
                                      width: `${metrics.actionHitSize}px`,
                                      height: `${metrics.actionHitSize}px`,
                                    }}
                                  >
                                    <Share2
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                      style={{
                                        height: `${metrics.actionStandaloneIconSize}px`,
                                        width: `${metrics.actionStandaloneIconSize}px`,
                                      }}
                                    />
                                  </button>
                                </div>

                                {psychologist.whatsapp_url ? (
                                  <div
                                    className="grid justify-items-center text-center"
                                    ref={(node) => {
                                      if (isActiveSlide) {
                                        actionAnchorRef.current = node;
                                      }
                                    }}
                                  >
                                    <PsychologistWhatsAppRedirectButton
                                      aria-label={`Chamar ${psychologist.name} no WhatsApp`}
                                      className="grid place-items-center rounded-full bg-transparent text-white transition active:scale-95"
                                      data-psychologists-tip-target={
                                        isActiveSlide ? "whatsapp" : undefined
                                      }
                                      onClick={handleWhatsappInteraction}
                                      psychologist={{
                                        avatar: psychologist.avatar,
                                        crp: psychologist.crp,
                                        id: psychologist.id,
                                        name: psychologist.name,
                                        typeLabel: formatProfileTitle(
                                          psychologist.gender,
                                          null,
                                          false,
                                        ),
                                        whatsappUrl: psychologist.whatsapp_url,
                                      }}
                                      stopPropagation
                                      tabIndex={slideShouldHideChrome ? -1 : undefined}
                                      style={{
                                        width: `${metrics.actionHitSize}px`,
                                        height: `${metrics.actionHitSize}px`,
                                      }}
                                    >
                                      <span
                                        className="grid place-items-center rounded-full bg-[#22C55E] transition hover:bg-[#16A34A]"
                                        style={{
                                          height: `${metrics.actionPrimaryButtonSize}px`,
                                          width: `${metrics.actionPrimaryButtonSize}px`,
                                        }}
                                      >
                                        <WhatsAppIcon
                                          aria-hidden="true"
                                          className="h-4 w-4"
                                          style={{
                                            color: "white",
                                            height: `${metrics.actionIconSize}px`,
                                            width: `${metrics.actionIconSize}px`,
                                          }}
                                        />
                                      </span>
                                    </PsychologistWhatsAppRedirectButton>
                                  </div>
                                ) : (
                                  <div
                                    className="grid justify-items-center text-center"
                                    ref={(node) => {
                                      if (isActiveSlide) {
                                        actionAnchorRef.current = node;
                                      }
                                    }}
                                  >
                                    <button
                                      aria-disabled="true"
                                      aria-label={`WhatsApp indisponível para ${psychologist.name}`}
                                      className="grid place-items-center rounded-full bg-transparent text-white transition"
                                      disabled={slideShouldHideChrome}
                                      onClick={stopInteractionPropagation}
                                      tabIndex={slideShouldHideChrome ? -1 : undefined}
                                      type="button"
                                      style={{
                                        width: `${metrics.actionHitSize}px`,
                                        height: `${metrics.actionHitSize}px`,
                                      }}
                                    >
                                      <span
                                        className="grid place-items-center rounded-full bg-[#22C55E]"
                                        style={{
                                          height: `${metrics.actionPrimaryButtonSize}px`,
                                          width: `${metrics.actionPrimaryButtonSize}px`,
                                        }}
                                      >
                                        <WhatsAppIcon
                                          aria-hidden="true"
                                          className="h-4 w-4"
                                          style={{
                                            color: "white",
                                            height: `${metrics.actionIconSize}px`,
                                            width: `${metrics.actionIconSize}px`,
                                          }}
                                        />
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </section>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}

            {shouldRenderSwipeHint ? (
              <div
                aria-live="polite"
                className="psychologists-swipe-hint pointer-events-none absolute left-1/2 z-50 inline-flex max-w-[calc(100%-2rem)] items-center justify-center rounded-full border border-white/70 bg-white/95 px-4 py-2.5 text-center text-[13px] font-extrabold text-[#0F172A] shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-[#D9E8F8]/80 backdrop-blur-md"
                style={{
                  bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom) + 14px)`,
                }}
              >
                <span>
                  <span className="text-[#308CE8]">↑</span> Descubra novos psicólogos
                </span>
              </div>
            ) : null}

            {activeOnboardingTip ? (
              <PsychologistsCoachMark
                onDismiss={() => setActiveOnboardingTip(null)}
                tip={activeOnboardingTip}
              />
            ) : null}

            {isFiltersOpen && typeof document !== "undefined"
              ? createPortal(
                  <div
                    aria-labelledby="psychologist-filters-title"
                    aria-modal="true"
                    className={cn(
                      "fixed inset-0 z-[140] flex items-end justify-center bg-foreground/55 p-0 text-foreground backdrop-blur-sm transition-opacity duration-200 ease-out sm:items-center sm:p-6",
                      isFilterSheetOpen ? "opacity-100" : "opacity-0",
                    )}
                    data-psychologists-scroll-lock="true"
                    onMouseDown={handleFiltersClose}
                    role="dialog"
                  >
                    <div
                      className={cn(
                        "flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-border bg-surface text-foreground shadow-[0_24px_70px_rgb(15_23_42_/_26%)] transition-transform duration-300 ease-out motion-reduce:transition-none sm:h-auto sm:max-h-[min(880px,calc(100dvh-2rem))] sm:max-w-[560px] sm:rounded-[32px] sm:border",
                        isFilterSheetOpen ? "translate-y-0" : "translate-y-full",
                      )}
                      onMouseDown={(event) => event.stopPropagation()}
                      ref={filterDialogRef}
                      role="document"
                      tabIndex={-1}
                    >
                      <div className="shrink-0 border-border border-b bg-surface/95 px-5 py-2.5 backdrop-blur sm:px-6 sm:py-3">
                        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3">
                          <button
                            aria-label="Fechar filtros"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-muted transition duration-200 ease-out hover:bg-surface-muted hover:text-foreground"
                            onClick={handleFiltersClose}
                            type="button"
                          >
                            <X className="h-4 w-4" aria-hidden="true" strokeWidth={2.25} />
                          </button>

                          <h2
                            className="self-center text-lg font-extrabold leading-5 text-foreground"
                            id="psychologist-filters-title"
                          >
                            Filtros de busca
                          </h2>

                          <button
                            className="self-center rounded-full px-2 py-1 text-[13px] font-medium text-[#2B7FC9] transition duration-200 ease-out hover:bg-[#EAF5FF] hover:text-[#1E6FB8] dark:text-[#8CCBFF] dark:hover:bg-primary/10"
                            onClick={clearFilters}
                            type="button"
                          >
                            Limpar
                          </button>

                          <p className="col-span-2 col-start-2 mt-1 max-w-[292px] text-[13px] leading-[17px] text-muted sm:max-w-none sm:text-sm sm:leading-5">
                            Ajuste os critérios para encontrar o psicólogo ideal para você
                          </p>
                        </div>
                      </div>

                      <filters.Form
                        {...filters.formProps}
                        className="psychologists-filter-dialog-scroll grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto px-5 py-4 sm:px-6"
                        onSubmit={handleSubmitFilters}
                      >
                        <section className="col-span-2 mt-2 grid gap-3">
                          <div>
                            <h3 className="text-sm font-extrabold text-foreground">
                              Selos e facilidades
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              Refine por confiança, acessibilidade e condições de atendimento.
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {FILTER_FEATURE_OPTIONS.map((option) => (
                              <FilterFeatureCard
                                checked={Boolean(filters.hook.watch(option.name))}
                                key={option.name}
                                onToggle={toggleFilterFeature}
                                option={option}
                              />
                            ))}
                          </div>
                        </section>

                        <div className="sticky bottom-0 col-span-2 -mx-5 mt-5 bg-gradient-to-t from-surface via-surface/95 to-surface/0 px-5 pt-8 pb-2 sm:-mx-6 sm:px-6">
                          <button
                            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgb(48_140_232_/_26%)] transition duration-200 ease-out hover:-translate-y-px hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            type="submit"
                          >
                            Aplicar filtros
                          </button>
                        </div>
                      </filters.Form>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>

          {shouldRenderDesktopControlRail ? (
            <aside
              aria-label="Ações da tela de Psicólogos"
              className="absolute top-0 left-[var(--psychologists-desktop-rail-left)] z-[60] hidden h-full w-[176px] lg:block"
            >
              {shouldRenderDesktopFeedControls ? (
                <div
                  aria-hidden={areDesktopFeedControlsHidden ? true : undefined}
                  className={cn(
                    "absolute top-[calc(env(safe-area-inset-top)+40px)] left-0 flex w-[76px] flex-col items-center gap-3 transition-opacity duration-200 ease-out",
                    desktopFeedControlsVisibilityClass,
                  )}
                  data-psychologists-scroll-lock="true"
                  ref={desktopSearchControlsRef}
                >
                  {isSearchFocused ? (
                    <div className="relative h-12 w-[76px]">
                      <span
                        aria-hidden="true"
                        className="-translate-x-1/2 absolute top-0 left-1/2 grid h-12 w-12 place-items-center rounded-full bg-white text-[#334155] shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
                      >
                        <Search className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <form
                        className="absolute top-0 left-[64px] w-[224px]"
                        onMouseDown={stopInteractionPropagation}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          registerSwipeHintInteraction();
                        }}
                        onSubmit={handleSearchSubmit}
                      >
                        <div className="relative flex h-12 w-full items-center rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_12px_34px_rgba(15,23,42,0.14)] transition-all duration-200 ease-out">
                          <input
                            aria-label="Buscar Psicólogos"
                            className="h-full w-full bg-transparent text-[14px] text-[#0f172a] outline-none placeholder:text-[#64748b]"
                            disabled={areDesktopFeedControlsHidden}
                            maxLength={120}
                            name="search"
                            onBlur={() => {
                              window.setTimeout(() => exitSearchMode({ shouldBlur: false }), 120);
                            }}
                            onChange={(event) => {
                              setSearchDraft(event.target.value);
                              enterSearchMode();
                            }}
                            onFocus={enterSearchMode}
                            placeholder="Buscar psicólogos"
                            ref={searchInputRef}
                            tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
                            type="text"
                            value={searchDraft}
                          />
                        </div>

                        {shouldRenderSearchSuggestions ? (
                          <div
                            aria-label="Sugestões de psicólogos"
                            className="absolute top-[calc(100%+8px)] left-0 w-full overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white text-[#0f172a] shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                            onMouseDown={(event) => event.preventDefault()}
                            role="listbox"
                          >
                            <div className="border-[#e2e8f0] border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-[#64748b] uppercase">
                              Profissionais cadastrados
                            </div>
                            {searchSuggestionsDirectory.isFetching ? (
                              <div className="px-3 py-3 text-sm font-medium text-[#64748b]">
                                Buscando profissionais...
                              </div>
                            ) : (
                              searchSuggestionItems.map((suggestion) => (
                                <button
                                  aria-label={`Buscar por ${suggestion.name}`}
                                  aria-selected={false}
                                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition hover:bg-[#f8fafc]"
                                  key={suggestion.id}
                                  onClick={() => handleSearchSuggestionSelect(suggestion.name)}
                                  role="option"
                                  type="button"
                                >
                                  <span className="min-w-0 truncate">{suggestion.name}</span>
                                  <span className="shrink-0 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-extrabold text-[#308ce8]">
                                    {suggestion.verified ? "Verificado" : "Gratuito"}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        ) : null}
                      </form>
                    </div>
                  ) : (
                    <button
                      aria-label="Pesquisar psicólogos"
                      className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#334155] shadow-[0_10px_28px_rgba(15,23,42,0.14)] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                      disabled={areDesktopFeedControlsHidden}
                      onClick={(event) => {
                        event.stopPropagation();
                        registerSwipeHintInteraction();
                        enterSearchMode();
                        window.setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                      tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
                      type="button"
                    >
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}

                  <button
                    aria-label="Abrir filtros"
                    className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#334155] shadow-[0_10px_28px_rgba(15,23,42,0.14)] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                    disabled={areDesktopFeedControlsHidden}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (isSearchFocused) {
                        exitSearchMode({ resumeVideo: false });
                      }
                      handleFiltersOpen();
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      registerSwipeHintInteraction();
                    }}
                    tabIndex={areDesktopFeedControlsHidden ? -1 : undefined}
                    type="button"
                  >
                    <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {shouldRenderDesktopActionRail && desktopActionPsychologist ? (
                <div
                  aria-hidden={isDesktopActionRailHidden ? true : undefined}
                  className={cn(
                    "absolute top-1/2 left-0 flex w-[68px] -translate-y-[35%] flex-col items-center gap-3 transition-opacity duration-200 ease-out",
                    desktopActionRailVisibilityClass,
                  )}
                >
                  <div className="grid w-[68px] justify-items-center gap-1 text-center">
                    <button
                      aria-label={`Ver perfil de ${desktopActionPsychologist.name}`}
                      className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#e2e8f0] bg-white p-0.5 text-[#0f172a] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                      disabled={isDesktopActionRailHidden}
                      onClick={(event) =>
                        navigateToPublicPsychologistProfile(desktopActionPsychologist.id, event)
                      }
                      onPointerDown={stopInteractionPropagation}
                      tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                      type="button"
                    >
                      <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#e2e8f0] text-[11px] font-bold text-[#334155]">
                        {desktopActionPsychologist.avatar ? (
                          <Image
                            alt={desktopActionPsychologist.name}
                            className="h-full w-full rounded-full object-cover"
                            fill
                            sizes="40px"
                            src={resolvePublicMediaUrl(desktopActionPsychologist.avatar) ?? ""}
                            unoptimized={isPublicMediaUrl(desktopActionPsychologist.avatar)}
                          />
                        ) : (
                          getInitials(desktopActionPsychologist.name)
                        )}
                      </span>
                    </button>
                    <span className="text-[10px] font-bold text-[#475569]">Perfil</span>
                  </div>

                  <div className="grid w-[68px] justify-items-center gap-1 text-center">
                    <button
                      aria-label={`Favoritar ${desktopActionPsychologist.name}`}
                      aria-busy={desktopActionIsFavoritePending}
                      aria-pressed={desktopActionIsFavorited}
                      className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e8f0] bg-white text-[#334155] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                      disabled={isDesktopActionRailHidden}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(desktopActionPsychologist);
                      }}
                      tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                      type="button"
                    >
                      <Heart
                        className="h-5 w-5"
                        aria-hidden="true"
                        style={{
                          color: desktopActionIsFavorited ? "#ef4444" : "#334155",
                          fill: desktopActionIsFavorited ? "#ef4444" : "transparent",
                        }}
                      />
                    </button>
                    <span className="text-[10px] font-bold text-[#475569]">Favoritar</span>
                  </div>

                  <div className="grid w-[68px] justify-items-center gap-1 text-center">
                    <button
                      aria-label={`Compartilhar perfil de ${desktopActionPsychologist.name}`}
                      className="grid h-10 w-10 place-items-center rounded-full border border-[#e2e8f0] bg-white text-[#334155] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                      disabled={isDesktopActionRailHidden}
                      onClick={(event) => {
                        event.stopPropagation();
                        void shareCurrent(desktopActionPsychologist);
                      }}
                      tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                      type="button"
                    >
                      <Share2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <span className="text-[10px] font-bold text-[#475569]">Compartilhar</span>
                  </div>

                  <div className="grid w-[68px] justify-items-center gap-1 text-center">
                    {desktopActionPsychologist.whatsapp_url ? (
                      <PsychologistWhatsAppRedirectButton
                        aria-label={`Chamar ${desktopActionPsychologist.name} no WhatsApp`}
                        className="grid h-10 w-10 place-items-center rounded-full border border-[#d5f5df] bg-white text-[#22C55E] transition hover:scale-105 hover:bg-[#f8fafc] active:scale-95"
                        data-psychologists-tip-target={
                          isDesktopActionRailHidden ? undefined : "whatsapp"
                        }
                        onClick={handleWhatsappInteraction}
                        psychologist={{
                          avatar: desktopActionPsychologist.avatar,
                          crp: desktopActionPsychologist.crp,
                          id: desktopActionPsychologist.id,
                          name: desktopActionPsychologist.name,
                          typeLabel: formatProfileTitle(
                            desktopActionPsychologist.gender,
                            null,
                            false,
                          ),
                          whatsappUrl: desktopActionPsychologist.whatsapp_url,
                        }}
                        stopPropagation
                        tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                      >
                        <WhatsAppIcon
                          aria-hidden="true"
                          className="h-5 w-5"
                          style={{ color: "#22C55E" }}
                        />
                      </PsychologistWhatsAppRedirectButton>
                    ) : (
                      <button
                        aria-disabled="true"
                        aria-label={`WhatsApp indisponível para ${desktopActionPsychologist.name}`}
                        className="grid h-10 w-10 place-items-center rounded-full border border-[#d5f5df] bg-white text-[#22C55E] opacity-55"
                        disabled={isDesktopActionRailHidden}
                        onClick={stopInteractionPropagation}
                        tabIndex={isDesktopActionRailHidden ? -1 : undefined}
                        type="button"
                      >
                        <WhatsAppIcon
                          aria-hidden="true"
                          className="h-5 w-5"
                          style={{ color: "#22C55E" }}
                        />
                      </button>
                    )}
                    <span className="text-[10px] font-bold text-[#475569]">WhatsApp</span>
                  </div>
                </div>
              ) : null}

              {shouldRenderDesktopNavigationRail ? (
                <div
                  aria-hidden={isDesktopActionRailHidden ? true : undefined}
                  className={cn(
                    "fixed top-1/2 right-[clamp(24px,3vw,54px)] flex -translate-y-1/2 flex-col items-center gap-5 transition-opacity duration-200 ease-out",
                    desktopActionRailVisibilityClass,
                  )}
                  data-psychologists-scroll-lock="true"
                >
                  <button
                    aria-label="Psicólogo anterior"
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-2xl bg-transparent text-foreground/80 transition-[background,color,opacity,transform] duration-200 ease-out hover:scale-105 hover:bg-surface-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95",
                      !canNavigateToPreviousPsychologist || isDesktopActionRailHidden
                        ? "cursor-not-allowed opacity-35 hover:scale-100"
                        : null,
                    )}
                    disabled={!canNavigateToPreviousPsychologist || isDesktopActionRailHidden}
                    onClick={navigateToPreviousPsychologist}
                    type="button"
                  >
                    <ArrowUp className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
                  </button>

                  <button
                    aria-label="Próximo psicólogo"
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-2xl bg-transparent text-foreground/80 transition-[background,color,opacity,transform] duration-200 ease-out hover:scale-105 hover:bg-surface-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-95",
                      !canNavigateToNextPsychologist || isDesktopActionRailHidden
                        ? "cursor-not-allowed opacity-35 hover:scale-100"
                        : null,
                    )}
                    disabled={!canNavigateToNextPsychologist || isDesktopActionRailHidden}
                    onClick={navigateToNextPsychologist}
                    type="button"
                  >
                    <ArrowDown className="h-7 w-7" aria-hidden="true" strokeWidth={2.3} />
                  </button>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </PrivateTemplate>
  );
};
