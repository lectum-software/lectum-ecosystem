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
  <div
    className="overflow-x-auto bg-background px-[14px] pt-2 pb-1.5 max-[359px]:px-2 lg:px-8"
    data-profile-tabs="true"
  >
    <div
      aria-label="Seções do perfil profissional"
      className="flex w-max min-w-full items-center gap-1"
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
              "relative isolate inline-flex h-[44px] shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-[12px] px-[10px] text-[13px] font-bold leading-5 tracking-normal before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[6px] before:-z-10 before:rounded-[12px] before:content-[''] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              active
                ? "text-foreground before:bg-surface before:shadow-lectum-tab dark:before:shadow-none"
                : "text-muted hover:text-foreground",
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
            <span>{tab.label}</span>
            {tab.value !== "geral" ? (
              <span
                className="text-[11px] font-bold leading-none tabular-nums text-subtle"
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
