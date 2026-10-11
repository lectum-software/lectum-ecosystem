"use client";

import { ArrowLeft, BadgeCheck, CornerUpLeft, FileText } from "lucide-react";
import Link from "next/link";
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
    <nav aria-label={interactionCopy.filterAriaLabel}>
      <div className="grid grid-cols-2 items-center gap-1.5 py-1" role="tablist">
        {tabs.map((item) => {
          const active = item.value === value;
          const count = counts?.[item.value];
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              aria-selected={active}
              className={cn(
                "inline-flex h-8 min-h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 text-xs font-bold leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65",
                active
                  ? "border-border/80 bg-surface text-foreground shadow-lectum-tab dark:border-border/70 dark:shadow-none"
                  : "border-transparent bg-transparent text-muted hover:text-foreground",
              )}
              disabled={disabled}
              onClick={() => onChange(item.value)}
              role="tab"
              type="button"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap text-xs font-bold leading-none">{item.label}</span>
              <span
                className="min-w-0 truncate text-xs font-bold leading-none tabular-nums text-primary-strong"
                title={count?.toLocaleString("pt-BR")}
              >
                {typeof count === "number" ? count.toLocaleString("pt-BR") : "\u2026"}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const MyPostsHeader = ({ interactionCopy }: { interactionCopy: InteractionCopy }) => (
  <header className="rounded-[26px] border border-border bg-surface px-4 py-3.5 shadow-lectum-soft dark:border-border dark:bg-surface sm:px-5 sm:py-4">
    <div className="grid min-h-10 grid-cols-[40px_1fr_40px] items-center gap-2">
      <Link
        aria-label="Voltar para perfil"
        className="grid h-10 w-10 place-items-center justify-self-start rounded-full bg-primary-soft text-primary transition hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href="/app/perfil"
        title="Voltar para perfil"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
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
