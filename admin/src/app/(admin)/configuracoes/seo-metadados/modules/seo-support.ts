"use client";

import type { AdminSeoMetadataSetting } from "@/api/req/settings";

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const DEFAULT_API_URL = "http://localhost:3001";

export const OG_IMAGE_MAX_SIZE_MB = 5;

export const OG_IMAGE_MAX_SIZE_BYTES = OG_IMAGE_MAX_SIZE_MB * 1024 * 1024;

export const OG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const OG_IMAGE_ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const apiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

export const configuredImageHosts = () => {
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

export const resolveOpenGraphPreviewSource = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("/public/files/")) return `${apiBaseUrl()}${normalized}`;
  if (normalized.startsWith("/")) return normalized;

  return null;
};

export const canRenderOpenGraphPreview = (src: string) => {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);

    return configuredImageHosts().has(url.hostname);
  } catch {
    return false;
  }
};

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
