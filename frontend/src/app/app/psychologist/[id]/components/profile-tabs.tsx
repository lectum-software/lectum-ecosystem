"use client";

import { cn } from "@/lib/utils";
import { type ProfileTab, tabs } from "../modules/support";

export const ProfileTabs = ({
  activeTab,
  onTabChange,
  publicationCount,
  reviewCount,
}: {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  publicationCount?: number;
  reviewCount: number;
}) => (
  <div className="sticky top-0 z-20 bg-background px-5 pt-3" data-profile-tabs="true">
    <div
      aria-label="Seções do perfil profissional"
      className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] items-center gap-1.5 py-1"
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const active = tab.value === activeTab;
        const count = tab.value === "publicacoes" ? publicationCount : reviewCount;

        return (
          <button
            aria-controls="profile-content"
            aria-selected={active}
            className={cn(
              "inline-flex h-8 min-h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 text-xs font-bold leading-none tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              active
                ? "border-border/80 bg-surface text-foreground shadow-lectum-tab dark:border-border/70 dark:shadow-none"
                : "border-transparent bg-transparent text-muted hover:text-foreground",
            )}
            id={`profile-tab-${tab.value}`}
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            onKeyDown={(event) => {
              const nextIndex =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (nextIndex === null) return;
              event.preventDefault();
              document.getElementById(`profile-tab-${tabs[nextIndex].value}`)?.focus();
              onTabChange(tabs[nextIndex].value);
            }}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            <span className="whitespace-nowrap text-xs font-bold leading-none">{tab.label}</span>
            {tab.value !== "geral" ? (
              <span
                className="min-w-0 truncate text-xs font-bold leading-none tabular-nums text-primary-strong"
                title={count?.toLocaleString("pt-BR")}
              >
                {count === undefined ? "…" : count.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  </div>
);
