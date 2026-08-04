"use client";

import {
  CheckCircle2,
  Eye,
  FileSearch,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminSeoMetadataImageUpload,
  useAdminSeoMetadataSettings,
  useAdminSeoMetadataUpdate,
} from "@/api/callers/settings";
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
const DEFAULT_API_URL = "http://localhost:3001";
const OG_IMAGE_MAX_SIZE_MB = 5;
const OG_IMAGE_MAX_SIZE_BYTES = OG_IMAGE_MAX_SIZE_MB * 1024 * 1024;
const OG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const OG_IMAGE_ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const apiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

const configuredImageHosts = () => {
  const hosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

  const addHost = (value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized) return;

    try {
      hosts.add(
        new URL(normalized.includes("://") ? normalized : `https://${normalized}`).hostname,
      );
    } catch {
      // Ignora entradas inválidas para manter a prévia segura.
    }
  };

  addHost(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
  process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",").forEach(addHost);

  return hosts;
};

const resolveOpenGraphPreviewSource = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("/public/files/")) return `${apiBaseUrl()}${normalized}`;
  if (normalized.startsWith("/")) return normalized;

  return null;
};

const canRenderOpenGraphPreview = (src: string) => {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);

    return configuredImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};

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

const compactOpenGraphText = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit - 3).trim()}...` : value;

const resolveOpenGraphDomain = (value: string) => {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "lectum.com.br";
  }
};

const SettingsHeader = () => (
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

const OpenGraphCardImage = ({ value }: { value?: string | null }) => {
  const src = resolveOpenGraphPreviewSource(value);
  const canRender = src ? canRenderOpenGraphPreview(src) : false;

  return (
    <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-surface-muted">
      {src && canRender ? (
        <Image
          alt="Prévia da imagem do card Open Graph"
          className="object-contain object-center"
          fill
          sizes="(min-width: 1280px) 31vw, (min-width: 1024px) 45vw, 92vw"
          src={src}
          unoptimized={src.startsWith("http://") || src.startsWith("https://")}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs font-semibold text-muted">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span>{src ? "Host externo não habilitado para prévia" : "Sem imagem Open Graph"}</span>
        </div>
      )}
    </div>
  );
};

const OpenGraphPreview = ({
  setting,
  values,
}: {
  setting?: AdminSeoMetadataSetting;
  values: SeoMetadataForm;
}) => {
  const previewUrl = resolvePreviewUrl(setting, values.canonical_url);
  const title =
    values.og_title || values.title || setting?.og_title || setting?.title || "Título Open Graph";
  const description =
    values.og_description ||
    values.description ||
    setting?.og_description ||
    setting?.description ||
    "Descrição usada em cards de compartilhamento.";

  return (
    <section className={cn(cardClass, "min-w-0 p-4 md:p-5")}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Eye className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">Prévia Open Graph</h2>
          <p className="text-sm text-muted">Simulação do card de compartilhamento.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[1.35rem] border border-border bg-surface">
        <OpenGraphCardImage value={values.og_image_url} />
        <div className="space-y-2 p-4">
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-muted">
            {resolveOpenGraphDomain(previewUrl)}
          </p>
          <h3 className="line-clamp-2 text-base font-bold leading-6 text-foreground">
            {compactOpenGraphText(title, 92)}
          </h3>
          <p className="line-clamp-2 text-sm leading-5 text-muted">
            {compactOpenGraphText(description, 140)}
          </p>
          <p className="truncate text-xs font-semibold text-primary">{previewUrl}</p>
        </div>
      </div>
    </section>
  );
};

const OpenGraphImagePreview = ({ value }: { value?: string | null }) => {
  const src = resolveOpenGraphPreviewSource(value);
  const canRender = src ? canRenderOpenGraphPreview(src) : false;

  return (
    <div className="relative aspect-[1.91/1] w-full max-w-44 overflow-hidden rounded-2xl border border-border bg-surface">
      {src && canRender ? (
        <Image
          alt="Prévia da imagem Open Graph"
          className="object-contain object-center"
          fill
          sizes="176px"
          src={src}
          unoptimized={src.startsWith("http://") || src.startsWith("https://")}
        />
      ) : (
        <div className="grid h-full place-items-center px-4 text-center text-xs font-semibold text-muted">
          {src ? "Host externo não habilitado" : "Sem imagem configurada"}
        </div>
      )}
    </div>
  );
};

const OpenGraphImageField = ({
  disabled,
  error,
  isUploading,
  onRemove,
  onUpload,
  value,
}: {
  disabled?: boolean;
  error?: string;
  isUploading?: boolean;
  onRemove: () => void;
  onUpload: (file: File) => Promise<void>;
  value?: string | null;
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const src = resolveOpenGraphPreviewSource(value);
  const canRender = src ? canRenderOpenGraphPreview(src) : false;
  const actionDisabled = Boolean(disabled || isUploading);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!OG_IMAGE_ACCEPTED_TYPES.has(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > OG_IMAGE_MAX_SIZE_BYTES) {
      toast.error(`A imagem deve ter até ${OG_IMAGE_MAX_SIZE_MB}MB.`);
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-foreground" htmlFor={inputId}>
          Imagem Open Graph
        </label>
      </div>
      <div className="rounded-[1.35rem] border border-border bg-surface-muted/45 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-start">
          <OpenGraphImagePreview value={value} />
          <div className="min-w-0">
            <p className="text-xs leading-5 text-muted">Envie uma imagem JPG, PNG ou WebP.</p>
            {src ? (
              <a
                className="mt-2 block truncate text-xs font-bold text-primary hover:underline"
                href={src}
                rel="noreferrer"
                target="_blank"
              >
                URL atual da imagem
              </a>
            ) : null}
            {src && !canRender ? (
              <p className="mt-2 text-xs font-semibold text-warning">
                Adicione o host em NEXT_PUBLIC_IMAGE_REMOTE_HOSTS para exibir a miniatura no Admin.
              </p>
            ) : null}
          </div>
        </div>
        <input
          accept={OG_IMAGE_ACCEPT}
          className="sr-only"
          disabled={actionDisabled}
          id={inputId}
          onChange={handleChange}
          ref={inputRef}
          type="file"
        />
        <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          <label
            aria-disabled={actionDisabled}
            className={cn(
              "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-admin-soft transition hover:bg-primary-hover",
              actionDisabled && "pointer-events-none cursor-not-allowed opacity-60",
            )}
            htmlFor={actionDisabled ? undefined : inputId}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 shrink-0" />
            )}
            {src ? "Trocar imagem" : "Enviar imagem"}
          </label>
          {value ? (
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-border px-4 text-sm font-bold text-muted transition hover:text-foreground disabled:opacity-60"
              disabled={actionDisabled}
              onClick={onRemove}
              type="button"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Remover
            </button>
          ) : null}
        </div>
      </div>
      <p className="min-h-5 px-1 text-xs font-semibold text-danger">{error || " "}</p>
    </div>
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
  const uploadImage = useAdminSeoMetadataImageUpload();
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

  const handleOpenGraphImageUpload = async (file: File) => {
    if (!selectedSetting) return;

    try {
      const result = await uploadImage.mutateAsync({
        file,
        pageKey: selectedSetting.page_key,
      });
      form.setValue("og_image_url", result.og_image_url, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Imagem enviada. Salve os metadados para publicar a alteração.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const handleOpenGraphImageRemove = () => {
    form.setValue("og_image_url", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.info("Imagem removida do formulário. Salve os metadados para publicar.");
  };

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
    <div className="min-w-0 space-y-6">
      <SettingsHeader />
      <SummaryCards settings={settings} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <PageSelector onSelect={setSelectedKey} selectedKey={selectedKey} settings={settings} />

        <div className="min-w-0 space-y-6">
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
                  placeholder="/psicologos ou https://lectum.com.br/psicologos"
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
                <OpenGraphImageField
                  disabled={!selectedSetting || update.isPending}
                  isUploading={uploadImage.isPending}
                  onRemove={handleOpenGraphImageRemove}
                  onUpload={handleOpenGraphImageUpload}
                  value={watchedValues.og_image_url}
                  error={form.formState.errors.og_image_url?.message}
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
                  disabled={update.isPending || uploadImage.isPending || !selectedSetting}
                  onClick={() => reset(toSeoMetadataFormValues(selectedSetting))}
                  type="button"
                >
                  Descartar alterações
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
                  disabled={update.isPending || uploadImage.isPending || !selectedSetting}
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

          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <SearchPreview setting={selectedSetting} values={watchedValues} />
            <OpenGraphPreview setting={selectedSetting} values={watchedValues} />
            <TechnicalNotes setting={selectedSetting} />
          </div>
        </div>
      </div>
    </div>
  );
};
