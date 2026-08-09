"use client";

import type { AdminSeoMetadataSetting } from "@/api/req/settings";
import { renderableImageSrc } from "@/lib/admin-media";

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const OG_IMAGE_MAX_SIZE_MB = 5;

export const OG_IMAGE_MAX_SIZE_BYTES = OG_IMAGE_MAX_SIZE_MB * 1024 * 1024;

export const OG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const OG_IMAGE_ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const resolveOpenGraphPreviewSource = (value?: string | null) =>
  renderableImageSrc(value ?? null);

export const canRenderOpenGraphPreview = (src: string) => Boolean(renderableImageSrc(src));

export const formatDateTime = (value?: string | null) => {
  if (!value) return "Ainda não atualizado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const robotsLabel = (
  setting?: Pick<AdminSeoMetadataSetting, "robots_follow" | "robots_index">,
) => {
  if (!setting) return "Carregando";
  if (setting.robots_index && setting.robots_follow) return "Indexar e seguir links";
  if (setting.robots_index && !setting.robots_follow) return "Indexar sem seguir links";
  if (!setting.robots_index && setting.robots_follow) return "Não indexar, seguir links";

  return "Não indexar";
};

export const resolvePreviewUrl = (setting?: AdminSeoMetadataSetting, canonical?: string) => {
  const value = canonical?.trim() || setting?.canonical_url || setting?.route_path || "/";

  if (value.startsWith("http")) return value;
  if (value.includes("[")) return `lectum.com.br${value}`;

  return `lectum.com.br${value.startsWith("/") ? value : `/${value}`}`;
};

export const compactDescription = (value: string) =>
  value.length > 168 ? `${value.slice(0, 165).trim()}...` : value;

export const compactOpenGraphText = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit - 3).trim()}...` : value;

export const resolveOpenGraphDomain = (value: string) => {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return "lectum.com.br";
  }
};
