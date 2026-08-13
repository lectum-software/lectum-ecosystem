"use client";

import { ArrowRight, Check, ChevronDown, Compass, Search, Settings, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { CommunityFeedScope, CommunityPost } from "@/api/generator/types/community";
import { MentorBadge } from "@/components/community/mentor-badge";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { Input } from "@/registry/new-york-v4/ui/input";
import {
  COMMUNITY_EXPLORE_HREF,
  COMMUNITY_FEED_CHIPS,
  getCommunityFeedChip,
} from "@/utils/community";
import {
  getCommunityAuthorDisplayName,
  getCommunityInitials as getInitials,
} from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

import {
  communityDetailHref,
  FEED_SCOPE_OPTIONS,
  feedHeaderControlClassName,
  feedHeaderDropdownPanelClassName,
  feedHeaderMenuItemClassName,
} from "../modules/feed-support";

export const AuthorAvatar = ({
  anonymous,
  author,
  href,
  onClick,
  size = "md",
}: {
  anonymous?: boolean;
  author: CommunityPost["author"];
  href?: string;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  size?: "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const imageSize = size === "lg" ? "40px" : "36px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-muted text-subtle ring-2 ring-border dark:bg-surface-muted dark:text-muted dark:ring-border",
          sizeClass,
        )}
      >
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(author.avatar);
  const displayName = getCommunityAuthorDisplayName(author);

  const avatarNode = (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-media-foreground dark:ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={displayName}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(displayName)
      )}
    </span>
  );

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${displayName}`}
      className="pointer-events-auto shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
      onClick={onClick}
    >
      {avatarNode}
    </Link>
  );
};

export const AuthorIdentityLine = ({
  badge,
  href,
  name,
  onClick,
  verified,
}: {
  badge?: string | null;
  href?: string;
  name: string;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  verified?: boolean;
}) => {
  const nameClassName = "min-w-0 truncate text-sm font-black leading-tight text-foreground";

  return (
    <div className="flex min-w-0 max-w-full items-center gap-0.5">
      {href ? (
        <Link
          className={cn("pointer-events-auto cursor-pointer", nameClassName)}
          href={href}
          onClick={onClick}
        >
          {name}
        </Link>
      ) : (
        <h2 className={nameClassName}>{name}</h2>
      )}
      {verified ? (
        <VerifiedBadgeIcon className="h-4 w-4 shrink-0" aria-label="Perfil verificado" />
      ) : null}
      <MentorBadge badge={badge} href={href} onClick={onClick} />
    </div>
  );
};

export const FilterMenu = ({
  onScopeChange,
  open,
  scope,
  setOpen,
}: {
  onScopeChange: (value: CommunityFeedScope) => void;
  open: boolean;
  scope: CommunityFeedScope;
  setOpen: (value: boolean) => void;
}) => (
  <div className="relative shrink-0">
    <button
      aria-expanded={open}
      aria-label="Filtrar feed"
      aria-haspopup="menu"
      className={feedHeaderControlClassName(open || scope === "following")}
      onClick={() => setOpen(!open)}
      type="button"
    >
      <Settings className="h-[18px] w-[18px] stroke-[2.4]" aria-hidden="true" />
    </button>

    {open ? (
      <div className={cn(feedHeaderDropdownPanelClassName, "right-0 w-64")}>
        {FEED_SCOPE_OPTIONS.map((item) => {
          const selected = item.value === scope;

          return (
            <button
              className={cn(feedHeaderMenuItemClassName(selected), "font-bold")}
              key={item.value}
              onClick={() => {
                onScopeChange(item.value);
                setOpen(false);
              }}
              type="button"
            >
              {item.label}
              {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    ) : null}
  </div>
);

export const FeedSearchMenu = ({
  onOpenChange,
  onSearchChange,
  open,
  search,
}: {
  onOpenChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  open: boolean;
  search: string;
}) => {
  const active = open || search.trim().length > 0;

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-label="Buscar no feed"
        aria-haspopup="dialog"
        className={feedHeaderControlClassName(active)}
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <Search className="h-[18px] w-[18px] stroke-[2.4]" aria-hidden="true" />
      </button>

      {open ? (
        <div className={cn(feedHeaderDropdownPanelClassName, "left-0 w-[min(82vw,320px)] p-2")}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar no feed"
              autoFocus
              className="h-10 rounded-[16px] border-border bg-background pl-10 text-sm font-semibold shadow-none"
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onOpenChange(false);
              }}
              placeholder="Buscar no feed"
              type="search"
              value={search}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export type FeedCommunityChip = (typeof COMMUNITY_FEED_CHIPS)[number];

export const FeedCommunitySelectorAvatar = ({
  community,
  variant = "button",
}: {
  community: FeedCommunityChip | null;
  variant?: "button" | "menu";
}) => {
  const sizeClassName = variant === "button" ? "h-7 w-7 rounded-[10px]" : "h-6 w-6 rounded-[9px]";
  const iconClassName = variant === "button" ? "h-3.5 w-3.5" : "h-3 w-3";

  if (!community) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center border border-primary/15 bg-primary-soft text-primary",
          sizeClassName,
        )}
        aria-hidden="true"
      >
        <Compass className={cn("stroke-[2.3]", iconClassName)} />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(community.iconUrl);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-border bg-surface-muted text-[0.68rem] font-black text-primary",
        sizeClassName,
      )}
      aria-hidden="true"
    >
      {avatarSrc ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={variant === "button" ? "28px" : "24px"}
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(community.iconUrl)}
        />
      ) : (
        getInitials(community.name)
      )}
    </span>
  );
};

export const FeedCommunitySelect = ({
  activeSlug,
  onOpenChange,
  open,
}: {
  activeSlug: string | null;
  onOpenChange: (value: boolean) => void;
  open: boolean;
}) => {
  const activeCommunity = getCommunityFeedChip(activeSlug);

  return (
    <div className="relative min-w-0 flex-1">
      <button
        aria-expanded={open}
        aria-label="Selecionar comunidade"
        aria-haspopup="listbox"
        className={cn(
          "group flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-[18px] border bg-background px-3 text-left text-[0.95rem] font-semibold leading-none tracking-[-0.025em] shadow-lectum-soft transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open
            ? "border-primary/45 bg-primary-soft text-primary shadow-lectum-soft"
            : "border-border text-foreground hover:border-primary/35 hover:bg-primary-soft/60 hover:text-primary",
        )}
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <FeedCommunitySelectorAvatar community={activeCommunity} />
          <span className="min-w-0 truncate">{activeCommunity?.name ?? "Escolher comunidade"}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition", open ? "rotate-180" : "rotate-0")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={cn(
            feedHeaderDropdownPanelClassName,
            "left-0 right-0 max-h-[70vh] overflow-y-auto",
          )}
        >
          <Link
            className={cn(feedHeaderMenuItemClassName(false), "font-black hover:text-primary")}
            href={COMMUNITY_EXPLORE_HREF}
            onClick={() => onOpenChange(false)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Compass className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">Todas as comunidades</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          </Link>

          <div className="my-1 h-px bg-border" />

          {COMMUNITY_FEED_CHIPS.map((item) => {
            const isActive = item.slug === activeSlug;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(feedHeaderMenuItemClassName(isActive), "font-bold")}
                href={communityDetailHref(item.slug)}
                key={item.slug}
                onClick={() => onOpenChange(false)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FeedCommunitySelectorAvatar community={item} variant="menu" />
                  <span className="min-w-0 truncate">{item.name}</span>
                </span>
                {isActive ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
