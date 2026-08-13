"use client";

import {
  ArrowLeft,
  Award,
  Check,
  ChevronDown,
  ListChecks,
  type LucideIcon,
  Search,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { CommunityDetail } from "@/api/generator/types/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";
import { getCommunityInitials as getInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  COMMUNITY_POST_SORT_PERIODS,
  COMMUNITY_POST_SORTS,
  type CommunityPostSelectedPeriods,
  type CommunityPostSort,
  type CommunityPostSortPeriod,
  type CommunityPostSortWithPeriod,
  communityPostSortChipClassName,
  formatCompactCount,
  getCommunityPostSortPeriodShortLabel,
} from "../modules/feed-support";
import {
  type CommunityPaletteStyle,
  type CommunityVisualPalette,
  clampNumber,
  useCommunityVisualPalette,
} from "../modules/palette";

export const CommunityLogo = ({
  community,
  palette,
}: {
  community: CommunityDetail;
  palette: CommunityVisualPalette;
}) => {
  const avatarSrc = resolvePublicMediaUrl(community.avatar_url);
  const avatarIsPublicMedia = isPublicMediaUrl(community.avatar_url);

  return (
    <span
      className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border-[4px] border-media-foreground text-center text-lg font-black leading-none shadow-lectum-soft dark:border-background"
      style={{
        background: `linear-gradient(135deg, ${palette.softColor} 0%, ${palette.gradientColor} 100%)`,
        color: palette.textColor,
      }}
    >
      {avatarSrc ? (
        <Image
          alt={`Avatar da comunidade ${community.name}`}
          className="object-cover"
          fill
          sizes="76px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(community.name)
      )}
    </span>
  );
};

export const CommunityDetailSkeleton = () => (
  <div className="grid gap-4">
    <div className="min-h-[260px] animate-pulse rounded-[28px] bg-surface shadow-[var(--lectum-shadow-soft)] dark:bg-surface" />
    <div className="grid gap-3">
      <div className="h-48 animate-pulse rounded-[22px] bg-surface dark:bg-surface" />
      <div className="h-48 animate-pulse rounded-[22px] bg-surface dark:bg-surface" />
    </div>
  </div>
);

export const CommunityRulesCard = ({ rules }: { rules: CommunityDetail["rules"] }) => {
  const rulesContentId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) => left.position - right.position || left.id.localeCompare(right.id),
      ),
    [rules],
  );

  const toggleRules = () => {
    setIsExpanded((current) => !current);
  };

  return (
    <section className="rounded-[22px] border border-border bg-surface p-4 shadow-lectum-soft dark:border-border dark:bg-surface">
      <button
        aria-controls={rulesContentId}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 rounded-[18px] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={toggleRules}
        type="button"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-foreground">Regras da comunidade</span>
          <span className="block text-xs font-semibold text-muted">
            {sortedRules.length > 0
              ? "Comunidade mediada por psicólogos e moderada pela equipe Lectum."
              : "Nenhuma regra ativa cadastrada para este espaço."}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-300 ease-out",
            isExpanded ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        id={rulesContentId}
      >
        <div className="overflow-hidden">
          {sortedRules.length > 0 ? (
            <ul className="grid gap-2 pt-3 text-sm leading-6 text-muted dark:text-muted">
              {sortedRules.map((rule) => (
                <li className="flex gap-2" key={rule.id}>
                  <ListChecks className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{rule.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-3 text-sm leading-6 text-muted dark:text-muted">
              As regras desta comunidade ainda não foram cadastradas pelo Admin.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export const CommunityHeader = ({
  community,
  following,
  membershipPending,
  onBack,
  onSearch,
  onShare,
  onToggleFollow,
}: {
  community: CommunityDetail;
  following: boolean;
  membershipPending: boolean;
  onBack: () => void;
  onSearch: () => void;
  onShare: () => void;
  onToggleFollow: () => void;
}) => {
  const palette = useCommunityVisualPalette(community);
  const communityPaletteStyle: CommunityPaletteStyle = {
    "--community-cover-depth": palette.coverDepthColor,
    "--community-cover-end": palette.coverEndColor,
    "--community-cover-start": palette.coverStartColor,
    "--community-gradient-color": palette.gradientColor,
    "--community-primary-color": palette.primaryColor,
    "--community-primary-dark": palette.primaryDarkColor,
    "--community-soft-color": palette.softColor,
    "--community-text-color": palette.textColor,
  };

  return (
    <header
      className="-mx-5 overflow-hidden rounded-b-[28px] bg-surface pb-5 shadow-lectum-soft dark:bg-surface"
      style={communityPaletteStyle}
    >
      <div
        className="relative min-h-[132px] px-5 pt-4 text-primary-foreground"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--lectum-media-foreground) 50%, transparent) 0%, color-mix(in srgb, var(--lectum-media-foreground) 18%, transparent) 38%, transparent 62%), linear-gradient(145deg, var(--community-cover-start) 0%, color-mix(in srgb, var(--community-cover-depth) 88%, var(--community-primary-color) 12%) 56%, color-mix(in srgb, var(--community-cover-end) 78%, var(--community-primary-dark) 22%) 100%)",
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <button
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <button
              aria-label={`Buscar em ${community.name}`}
              className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25"
              onClick={onSearch}
              type="button"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              aria-label="Compartilhar comunidade"
              className="grid h-10 w-10 place-items-center rounded-full bg-media-background/15 text-primary-foreground backdrop-blur transition hover:bg-media-background/25"
              onClick={onShare}
              type="button"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span
          className="community-header-highlight pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
      </div>

      <div className="relative px-5">
        <div className="-mt-8 flex items-end justify-between gap-4">
          <CommunityLogo community={community} palette={palette} />
          <CommunityFollowButton
            disabled={membershipPending}
            following={following}
            onClick={onToggleFollow}
            pending={membershipPending}
            size="hero"
          />
        </div>

        <div className="mt-4 grid gap-2">
          <h1 className="text-[1.55rem] font-black leading-tight tracking-[-0.03em] text-foreground dark:text-foreground">
            {community.name}
          </h1>
          <p className="text-sm font-semibold text-muted">
            {formatCompactCount(community.members_count, "seguidor", "seguidores")}{" "}
            <span aria-hidden="true">•</span>{" "}
            {formatCompactCount(community.posts_count, "post", "posts")}
          </p>
          {community.description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted dark:text-muted">
              {community.description}
            </p>
          ) : (
            <p className="max-w-2xl text-sm leading-6 text-muted dark:text-muted">
              Esta comunidade ainda não possui descrição cadastrada pela equipe Lectum.
            </p>
          )}
          <Link
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--community-soft-color)] px-3 py-1.5 text-xs font-black text-[var(--community-text-color)] transition hover:bg-[var(--community-primary-color)] hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--community-primary-color)] focus-visible:ring-offset-2"
            href={`/comunidades/top-mentores?community=${community.slug}`}
          >
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Ver Top 5 mentores da comunidade
          </Link>
        </div>
      </div>
    </header>
  );
};

export const CommunityContextSearchHeader = ({
  communityName,
  inputRef,
  onBack,
  onSearchChange,
  search,
}: {
  communityName: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  search: string;
}) => (
  <header className="sticky top-0 z-30 -mx-5 border-border border-b bg-background px-5 py-3">
    <div className="mx-auto flex max-w-[430px] items-center gap-3 sm:max-w-2xl lg:max-w-[760px]">
      <button
        aria-label={`Voltar para ${communityName}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="grid min-w-0 flex-1 gap-2">
        <h2 className="truncate text-sm font-black text-foreground">Buscar em {communityName}</h2>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          />
          <Input
            aria-label={`Buscar em ${communityName}`}
            className="h-11 rounded-full bg-surface pl-11 text-sm shadow-sm"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Buscar em ${communityName}`}
            ref={inputRef}
            type="search"
            value={search}
          />
        </div>
      </div>
    </div>
  </header>
);

export const CommunityPeriodSortChip = ({
  active,
  icon: Icon,
  label,
  onPeriodChange,
  period,
  value,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPeriodChange: (sort: CommunityPostSortWithPeriod, period: CommunityPostSortPeriod) => void;
  period: CommunityPostSortPeriod | null;
  value: CommunityPostSortWithPeriod;
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const periodLabel = period ? getCommunityPostSortPeriodShortLabel(period) : null;
  const showPeriod = active && Boolean(periodLabel);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const viewportPadding = 12;
    const desiredWidth = Math.max(rect.width, 232);
    const availableWidth = Math.max(window.innerWidth - viewportPadding * 2, 160);
    const width = Math.min(desiredWidth, availableWidth);
    const left = clampNumber(
      rect.left,
      viewportPadding,
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    const estimatedHeight = 198;
    const preferredTop = rect.bottom + 8;
    const top =
      preferredTop + estimatedHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, rect.top - estimatedHeight - 8)
        : preferredTop;

    setMenuStyle({
      left,
      maxHeight: "min(16rem, calc(100vh - 1.5rem))",
      top,
      width,
    });
  }, []);

  const toggleMenu = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-pressed={active}
        className={communityPostSortChipClassName(active)}
        onClick={toggleMenu}
        ref={buttonRef}
        type="button"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden="true" strokeWidth={1.9} />
        <span className="whitespace-nowrap text-xs font-bold leading-none">{label}</span>
        <ChevronDown
          className={cn(
            "-ml-0.5 h-3.5 w-3.5 shrink-0 opacity-80 transition-transform duration-200",
            open ? "rotate-180" : "",
          )}
          aria-hidden="true"
        />
        {showPeriod ? (
          <span className="ml-0.5 rounded-full border border-border/70 bg-surface/60 px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary dark:border-primary/25 dark:bg-media-foreground/10 dark:text-muted">
            {periodLabel}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[90] overflow-y-auto rounded-[18px] border border-border bg-surface p-1.5 shadow-lectum-soft outline-none animate-in fade-in slide-in-from-top-1 duration-150 dark:border-border dark:bg-surface"
              id={menuId}
              ref={menuRef}
              role="menu"
              style={menuStyle}
            >
              {COMMUNITY_POST_SORT_PERIODS.map((option) => {
                const selected = option.value === period;

                return (
                  <button
                    aria-checked={selected}
                    className={cn(
                      "group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold tracking-[-0.01em] transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                      selected
                        ? "bg-primary-soft/75 text-primary-hover"
                        : "text-muted hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted",
                    )}
                    key={option.value}
                    onClick={() => {
                      onPeriodChange(value, option.value);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    <span>{option.label}</span>
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                        selected
                          ? "border-primary/20 bg-surface/80 text-primary"
                          : "border-transparent text-transparent group-hover:border-primary/10 group-hover:text-primary/40",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export const CommunityPostSortChips = ({
  onChange,
  onPeriodChange,
  periods,
  value,
}: {
  onChange: (value: CommunityPostSort) => void;
  onPeriodChange: (sort: CommunityPostSortWithPeriod, period: CommunityPostSortPeriod) => void;
  periods: CommunityPostSelectedPeriods;
  value: CommunityPostSort;
}) => (
  <nav
    aria-label="Ordenação dos posts"
    className="w-full max-w-full overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <div className="flex min-w-max items-center gap-1.5 py-1 pr-2">
      {COMMUNITY_POST_SORTS.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        const hasPeriod = "period" in item;
        const periodValue = hasPeriod
          ? (periods[item.value as CommunityPostSortWithPeriod] ?? null)
          : null;
        if (hasPeriod) {
          return (
            <CommunityPeriodSortChip
              active={active}
              icon={Icon}
              key={item.value}
              label={item.label}
              onPeriodChange={onPeriodChange}
              period={periodValue}
              value={item.value as CommunityPostSortWithPeriod}
            />
          );
        }

        return (
          <button
            aria-pressed={active}
            className={communityPostSortChipClassName(active)}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 opacity-85"
              aria-hidden="true"
              strokeWidth={1.9}
            />
            <span className="whitespace-nowrap text-xs font-bold leading-none">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
