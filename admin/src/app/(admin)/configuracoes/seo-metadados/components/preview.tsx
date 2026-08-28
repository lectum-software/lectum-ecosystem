"use client";

import { Eye, ImagePlus, Search, ShieldCheck, Tags } from "lucide-react";
import Image from "next/image";
import type { AdminSeoMetadataSetting } from "@/api/req/settings";
import type { DynamicOpenGraphImageNotice } from "@/lib/seo-dynamic-og-image";
import { cn } from "@/lib/utils";
import {
  canRenderOpenGraphPreview,
  cardClass,
  compactDescription,
  compactOpenGraphText,
  resolveOpenGraphDomain,
  resolveOpenGraphPreviewSource,
  resolvePreviewUrl,
  robotsLabel,
} from "../modules/seo-support";
import type { SeoMetadataForm } from "../use-form";

export const SearchPreview = ({
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

export const OpenGraphCardImage = ({ value }: { value?: string | null }) => {
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

export const OpenGraphPreview = ({
  dynamicImageNotice,
  setting,
  values,
}: {
  dynamicImageNotice?: DynamicOpenGraphImageNotice | null;
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
          <p className="text-sm text-muted">
            {dynamicImageNotice?.previewDescription || "Simulação do card de compartilhamento."}
          </p>
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

export const OpenGraphImagePreview = ({ value }: { value?: string | null }) => {
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
