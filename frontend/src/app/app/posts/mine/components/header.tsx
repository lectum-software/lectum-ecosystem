"use client";

import { useSearchParams } from "next/navigation";
import type { UserPostsType } from "@/api/generator/types/posts";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { profileSectionTabStyles as styles } from "@/components/ui/profile-section-tab-styles";
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
    { label: "Posts", value: "posts" as const },
    { label: interactionCopy.plural, value: "replies" as const },
  ];

  return (
    <nav aria-label={interactionCopy.filterAriaLabel}>
      <div className={styles.list} role="tablist" aria-label={interactionCopy.filterAriaLabel}>
        {tabs.map((item, index) => {
          const active = item.value === value;
          const count = counts?.[item.value];
          return (
            <button
              key={item.value}
              aria-selected={active}
              className={cn(styles.button, active ? styles.active : styles.inactive)}
              disabled={disabled}
              onClick={() => onChange(item.value)}
              id={`my-publications-tab-${item.value}`}
              tabIndex={active ? 0 : -1}
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
                if (nextIndex === null || disabled) return;
                event.preventDefault();
                document.getElementById(`my-publications-tab-${tabs[nextIndex].value}`)?.focus();
                onChange(tabs[nextIndex].value);
              }}
              role="tab"
              type="button"
            >
              <span className={styles.label}>{item.label}</span>
              <span className={styles.count} title={count?.toLocaleString("pt-BR")}>
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
