"use client";

import {
  CheckCircle2,
  Eye,
  FileSearch,
  Globe2,
  Info,
  Link2,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { useAdminSeoMetadataSettings, useAdminSeoMetadataUpdate } from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type { AdminSeoMetadataPageKey, AdminSeoMetadataSetting } from "@/api/req/settings";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { Form } from "@/hooks/form";
import { cn } from "@/lib/utils";
import {
  type SeoMetadataForm,
  toSeoMetadataFormValues,
  toSeoMetadataPayload,
  useSeoMetadataForm,
} from "./use-form";

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Ainda não atualizado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

const robotsLabel = (setting?: Pick<AdminSeoMetadataSetting, "robots_follow" | "robots_index">) => {
  if (!setting) return "Carregando";
  if (setting.robots_index && setting.robots_follow) return "Indexar e seguir links";
  if (setting.robots_index && !setting.robots_follow) return "Indexar sem seguir links";
  if (!setting.robots_index && setting.robots_follow) return "Não indexar, seguir links";

  return "Não indexar";
};

const resolvePreviewUrl = (setting?: AdminSeoMetadataSetting, canonical?: string) => {
  const value = canonical?.trim() || setting?.canonical_url || setting?.route_path || "/";

  if (value.startsWith("http")) return value;
  if (value.includes("[")) return `lectum.com.br${value}`;

  return `lectum.com.br${value.startsWith("/") ? value : `/${value}`}`;
};

const compactDescription = (value: string) =>
  value.length > 168 ? `${value.slice(0, 165).trim()}...` : value;

const SettingsHeader = () => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Configurações de busca
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          SEO / Metadados
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Configure títulos, descrições, Open Graph e regras de indexação das páginas públicas da
          Lectum renderizadas para motores de busca.
        </p>
      </div>
      <div className="rounded-[1.35rem] border border-primary/15 bg-primary-soft p-4 text-sm text-primary lg:max-w-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-6">
            Áreas privadas como /app, /auth e dashboards permanecem fora de indexação.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const SummaryCards = ({ settings }: { settings: AdminSeoMetadataSetting[] }) => {
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

const PageSelector = ({
  onSelect,
  selectedKey,
  settings,
}: {
  onSelect: (key: AdminSeoMetadataPageKey) => void;
  selectedKey: AdminSeoMetadataPageKey;
  settings: AdminSeoMetadataSetting[];
}) => (
  <section className={cn(cardClass, "p-4 md:p-5")}>
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Globe2 className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground">Páginas públicas</h2>
        <p className="text-sm text-muted">Selecione uma página para editar os metadados.</p>
      </div>
    </div>
    <div className="grid gap-2">
      {settings.map((setting) => {
        const isSelected = setting.page_key === selectedKey;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "w-full rounded-[1.35rem] border p-4 text-left transition",
              isSelected
                ? "border-primary bg-primary-soft text-primary ring-2 ring-primary/10"
                : "border-border bg-surface text-foreground hover:border-primary/30 hover:bg-surface-muted",
            )}
            key={setting.page_key}
            onClick={() => onSelect(setting.page_key)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{setting.label}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-muted">
                  {setting.route_path || "Fallback global"}
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
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

const SearchPreview = ({
  setting,
  values,
}: {
  setting?: AdminSeoMetadataSetting;
  values: SeoMetadataForm;
}) => {
  const title = values.title || setting?.title || "Título da página";
  const description = values.description || setting?.description || "Descrição da página.";

  return (
    <section className={cn(cardClass, "p-4 md:p-5")}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Search className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">Prévia de busca</h2>
          <p className="text-sm text-muted">Simulação visual com os campos atuais.</p>
        </div>
      </div>
      <div className="rounded-[1.35rem] border border-border bg-surface-muted/50 p-4">
        <p className="truncate text-xs font-semibold text-success">
          {resolvePreviewUrl(setting, values.canonical_url)}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-6 text-primary">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{compactDescription(description)}</p>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-muted">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            {robotsLabel({
              robots_follow: values.robots_follow === "true",
              robots_index: values.robots_index === "true",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary" />
          <span>{values.keywords.trim() || "Sem palavras-chave adicionais"}</span>
        </div>
      </div>
    </section>
  );
};

const TechnicalNotes = ({ setting }: { setting?: AdminSeoMetadataSetting }) => (
  <section className={cn(cardClass, "p-4 md:p-5")}>
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-foreground">Publicação</h2>
        <p className="text-sm text-muted">Persistência real no backend.</p>
      </div>
    </div>
    <dl className="space-y-3 text-sm">
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Última atualização</dt>
        <dd className="mt-1 text-muted">{formatDateTime(setting?.updated_at)}</dd>
      </div>
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Rota</dt>
        <dd className="mt-1 text-muted">{setting?.route_path || "Fallback global"}</dd>
      </div>
      <div className="rounded-2xl bg-surface-muted/60 p-3">
        <dt className="font-bold text-foreground">Robots</dt>
        <dd className="mt-1 text-muted">{robotsLabel(setting)}</dd>
      </div>
    </dl>
  </section>
);

export const AdminSeoMetadataClient = () => {
  const query = useAdminSeoMetadataSettings();
  const update = useAdminSeoMetadataUpdate();
  const [selectedKey, setSelectedKey] = useState<AdminSeoMetadataPageKey>("default");
  const form = useSeoMetadataForm();
  const { reset } = form;

  const settings = useMemo(() => query.data?.settings ?? [], [query.data?.settings]);
  const selectedSetting = useMemo(
    () => settings.find((setting) => setting.page_key === selectedKey) ?? settings[0],
    [selectedKey, settings],
  );

  useEffect(() => {
    if (!selectedSetting) return;

    reset(toSeoMetadataFormValues(selectedSetting));
  }, [reset, selectedSetting]);

  const watchedValues = form.watch();

  const onSubmit: SubmitHandler<SeoMetadataForm> = async (values) => {
    if (!selectedSetting) return;

    try {
      await update.mutateAsync({
        input: toSeoMetadataPayload(values),
        pageKey: selectedSetting.page_key,
      });
      toast.success("Metadados de SEO salvos com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (query.isLoading) {
    return (
      <div className={cn(cardClass, "flex min-h-72 items-center justify-center p-8 text-muted")}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando metadados...
      </div>
    );
  }

  if (query.isError) {
    return <div className={cn(cardClass, "p-6 text-danger")}>{resolveApiError(query.error)}</div>;
  }

  return (
    <div className="space-y-6">
      <SettingsHeader />
      <SummaryCards settings={settings} />

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <PageSelector onSelect={setSelectedKey} selectedKey={selectedKey} settings={settings} />

        <div className="space-y-6">
          <section className={cn(cardClass, "p-4 md:p-6")}>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Página selecionada
                </p>
                <h2 className="mt-2 text-2xl font-bold text-foreground">
                  {selectedSetting?.label || "SEO"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedSetting?.route_path || "Configuração padrão usada como fallback."}
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                {robotsLabel(selectedSetting)}
              </span>
            </div>

            <Form className="space-y-4" form={form} onSubmit={onSubmit}>
              <div className="grid gap-4 lg:grid-cols-2">
                <InputController<SeoMetadataForm>
                  label="Título SEO"
                  maxLength={140}
                  name="title"
                  placeholder="Ex.: Psicólogos | Lectum"
                  required
                />
                <InputController<SeoMetadataForm>
                  label="URL canônica"
                  name="canonical_url"
                  placeholder="/psychologists ou https://lectum.com.br/psychologists"
                />
              </div>

              <TextareaController<SeoMetadataForm>
                label="Descrição SEO"
                name="description"
                placeholder="Resumo curto e claro para resultados de busca."
                required
                rows={4}
              />

              <InputController<SeoMetadataForm>
                label="Palavras-chave"
                name="keywords"
                placeholder="psicologia, terapia online, saúde mental"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <InputController<SeoMetadataForm>
                  label="Título Open Graph"
                  maxLength={140}
                  name="og_title"
                  placeholder="Título para compartilhamento social"
                />
                <InputController<SeoMetadataForm>
                  label="Imagem Open Graph"
                  name="og_image_url"
                  placeholder="/logo-light.png ou URL absoluta"
                />
              </div>

              <TextareaController<SeoMetadataForm>
                label="Descrição Open Graph"
                name="og_description"
                placeholder="Descrição usada em cards de compartilhamento."
                rows={3}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectController<SeoMetadataForm>
                  label="Robots: index"
                  name="robots_index"
                  options={[
                    { label: "Indexar", value: "true" },
                    { label: "Não indexar", value: "false" },
                  ]}
                  required
                />
                <SelectController<SeoMetadataForm>
                  label="Robots: follow"
                  name="robots_follow"
                  options={[
                    { label: "Seguir links", value: "true" },
                    { label: "Não seguir links", value: "false" },
                  ]}
                  required
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted hover:text-foreground"
                  disabled={update.isPending || !selectedSetting}
                  onClick={() => reset(toSeoMetadataFormValues(selectedSetting))}
                  type="button"
                >
                  Descartar alterações
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
                  disabled={update.isPending || !selectedSetting}
                  type="submit"
                >
                  {update.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar metadados
                </button>
              </div>
            </Form>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <SearchPreview setting={selectedSetting} values={watchedValues} />
            <TechnicalNotes setting={selectedSetting} />
          </div>
        </div>
      </div>
    </div>
  );
};
