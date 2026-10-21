"use client";

import { CornerUpLeft, FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { UserPostsType } from "@/api/generator/types/posts";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { cn } from "@/lib/utils";
import { analyticsReturnHref } from "@/utils/analytics-return";

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

export const MyPostsHeader = ({ interactionCopy }: { interactionCopy: InteractionCopy }) => {
  const searchParams = useSearchParams();
  const returnTo = analyticsReturnHref(searchParams?.get("returnTo") ?? null);
  return (
    <AppPageHeader
      backHref={returnTo ?? "/app/perfil"}
      backLabel={returnTo ? "Voltar para Analytics" : "Voltar para perfil"}
      title={interactionCopy.screenTitle}
    />
  );
};
