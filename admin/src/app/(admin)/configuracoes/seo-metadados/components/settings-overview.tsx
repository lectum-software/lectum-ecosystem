"use client";

import { Eye, FileSearch, Globe2, Link2, Search } from "lucide-react";
import type { AdminSeoMetadataPageKey, AdminSeoMetadataSetting } from "@/api/req/settings";
import { cn } from "@/lib/utils";
import { cardClass } from "../modules/seo-support";

export const SettingsHeader = () => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Configurações de busca
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          SEO / Metadados
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Configure títulos, descrições, Open Graph e regras de indexação das páginas públicas da
          Lectum renderizadas para motores de busca. Áreas privadas permanecem fora de indexação.
        </p>
      </div>
    </div>
  </section>
);

export const SummaryCards = ({ settings }: { settings: AdminSeoMetadataSetting[] }) => {
  const indexableCount = settings.filter((setting) => setting.robots_index).length;
  const ogCount = settings.filter((setting) => setting.og_title || setting.og_description).length;
  const canonicalCount = settings.filter((setting) => setting.canonical_url).length;

  const items = [
    { label: "Páginas", value: settings.length, icon: <FileSearch className="h-5 w-5" /> },
    { label: "Indexáveis", value: indexableCount, icon: <Search className="h-5 w-5" /> },
    { label: "Open Graph", value: ogCount, icon: <Eye className="h-5 w-5" /> },
    { label: "Canônicas", value: canonicalCount, icon: <Link2 className="h-5 w-5" /> },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div className={cn(cardClass, "flex items-center gap-4 p-4 md:p-5")} key={item.label}>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            {item.icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export const PageSelector = ({
  onSelect,
  selectedKey,
  settings,
}: {
  onSelect: (key: AdminSeoMetadataPageKey) => void;
  selectedKey: AdminSeoMetadataPageKey;
  settings: AdminSeoMetadataSetting[];
}) => (
  <section className={cn(cardClass, "min-w-0 overflow-hidden p-4 md:p-5")}>
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Globe2 className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground">Páginas públicas</h2>
        <p className="text-sm text-muted">Selecione uma página para editar os metadados.</p>
      </div>
    </div>
    <div className="grid min-w-0 gap-2">
      {settings.map((setting) => {
        const isSelected = setting.page_key === selectedKey;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "w-full min-w-0 overflow-hidden rounded-[1.35rem] border p-4 text-left transition",
              isSelected
                ? "border-primary bg-primary-soft text-primary ring-2 ring-primary/10"
                : "border-border bg-surface text-foreground hover:border-primary/30 hover:bg-surface-muted",
            )}
            key={setting.page_key}
            onClick={() => onSelect(setting.page_key)}
            type="button"
          >
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{setting.label}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-muted">
                  {setting.route_path || "Fallback global"}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  setting.robots_index
                    ? "bg-primary-soft text-primary"
                    : "bg-surface-muted text-muted",
                )}
              >
                {setting.robots_index ? "index" : "noindex"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
);
