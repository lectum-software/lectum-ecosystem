"use client";

import { profileSectionTabStyles as styles } from "@/components/ui/profile-section-tab-styles";
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
    <div aria-label="Seções do perfil profissional" className={styles.list} role="tablist">
      {tabs.map((tab, index) => {
        const active = tab.value === activeTab;
        const count = tab.value === "publicacoes" ? publicationCount : reviewCount;

        return (
          <button
            aria-controls="profile-content"
            aria-selected={active}
            className={cn(styles.button, active ? styles.active : styles.inactive)}
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
            <span className={styles.label}>{tab.label}</span>
            {tab.value !== "geral" ? (
              <span className={styles.count} title={count?.toLocaleString("pt-BR")}>
                {count === undefined ? "…" : count.toLocaleString("pt-BR")}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  </div>
);
