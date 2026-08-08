"use client";

import { BadgeCheck, ChevronLeft, CornerUpLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import type { UserPostsType } from "@/api/generator/types/posts";
import { cn } from "@/lib/utils";

import type { FilterTabCounts, InteractionCopy } from "../modules/support";

export const FilterTabs = ({
  counts,
  disabled,
  interactionCopy,
  onChange,
  value,
}: {
  counts?: FilterTabCounts;
  disabled?: boolean;
  interactionCopy: InteractionCopy;
  onChange: (value: UserPostsType) => void;
  value: UserPostsType;
}) => {
  const tabs = [
    { icon: FileText, label: "Posts", value: "posts" as const },
    { icon: CornerUpLeft, label: interactionCopy.plural, value: "replies" as const },
  ];

  return (
    <nav
      aria-label={interactionCopy.filterAriaLabel}
      className="overflow-hidden rounded-[24px] border border-border bg-surface/95 px-3 py-4 dark:border-border dark:bg-surface sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5" role="tablist">
        {tabs.map((item, index) => {
          const active = item.value === value;
          const count = counts?.[item.value];
          const formattedCount = typeof count === "number" ? count.toLocaleString("pt-BR") : "...";
          const Icon = item.icon;

          return (
            <Fragment key={item.value}>
              {index > 0 ? (
                <span
                  className="hidden h-5 w-px bg-surface-muted dark:bg-border sm:block"
                  aria-hidden="true"
                />
              ) : null}
              <button
                aria-selected={active}
                className={cn(
                  "inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-[13px] font-bold leading-none transition-[background-color,color,opacity] disabled:opacity-65",
                  active
                    ? "text-primary"
                    : "text-muted hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground",
                )}
                disabled={disabled}
                onClick={() => onChange(item.value)}
                role="tab"
                type="button"
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted dark:text-muted",
                  )}
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">
                  <strong
                    className={cn(
                      "font-extrabold",
                      active ? "text-primary" : "text-foreground dark:text-foreground",
                    )}
                  >
                    {formattedCount}
                  </strong>{" "}
                  {item.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export const MyPostsHeader = ({ interactionCopy }: { interactionCopy: InteractionCopy }) => (
  <header className="rounded-[26px] border border-border bg-surface px-4 py-3.5 shadow-lectum-soft dark:border-border dark:bg-surface sm:px-5 sm:py-4">
    <div className="grid min-h-9 grid-cols-[36px_1fr_36px] items-center gap-2">
      <Link
        aria-label="Voltar para perfil"
        className="inline-flex h-9 w-9 items-center justify-center justify-self-start rounded-full border border-border bg-surface text-muted shadow-lectum-soft transition hover:-translate-x-0.5 hover:border-border hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:border-border dark:bg-surface dark:text-foreground"
        href="/app/perfil"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 truncate text-center text-[16px] font-extrabold leading-tight tracking-[-0.025em] text-foreground dark:text-foreground sm:text-[17px]">
        {interactionCopy.screenTitle}
      </h1>
      <span aria-hidden="true" />
    </div>
  </header>
);

export const ProfessionalAnsweredBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/70 px-2.5 text-[10px] font-black tracking-[-0.01em] text-primary",
      className,
    )}
  >
    Respondido por psicólogo verificado
    <BadgeCheck className="h-3.5 w-3.5 fill-primary text-primary-foreground" aria-hidden="true" />
  </span>
);
