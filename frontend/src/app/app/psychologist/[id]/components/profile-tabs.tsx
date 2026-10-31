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
  <div className="bg-background px-2 pt-2 lg:px-8" data-profile-tabs="true">
    <div
      aria-label="Seções do perfil profissional"
      className="flex w-full items-center justify-center border-b border-border"
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
              "relative inline-flex h-[44px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-[3px] bg-transparent px-0 before:pointer-events-none before:absolute before:inset-x-3 before:bottom-0 before:h-[2px] before:rounded-full before:content-[''] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20",
              active ? "text-foreground before:bg-foreground" : "text-muted hover:text-foreground",
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
            <span className="min-w-0 truncate text-[13px] font-semibold leading-5 max-[359px]:text-[12px]">
              {tab.label}
            </span>
            {tab.value !== "geral" ? (
              <span
                className="h-[18px] min-w-[18px] max-w-[40%] shrink-0 truncate rounded-[5px] bg-surface-muted px-1 text-center text-[11px] font-semibold leading-[18px] tabular-nums text-muted"
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
