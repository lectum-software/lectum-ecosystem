import type { Metadata } from "next";
import { isAllowedPublicAssetSource, parsePublicAssetSource } from "@/utils/public-asset-sources";
import {
  PUBLIC_COMMUNITIES_HREF,
  PUBLIC_PSYCHOLOGISTS_HREF,
  PUBLIC_TOP_MENTORS_HREF,
} from "@/utils/public-routes";

const DEFAULT_SITE_URL =
  process.env.NODE_ENV === "production" ? "https://lectum.com.br" : "http://localhost:3000";

export const SITE_NAME = process.env.NEXT_PUBLIC_SYSTEM_NAME || "Lectum";

const configuredSiteDescription = process.env.NEXT_PUBLIC_SYSTEM_DESCRIPTION?.trim();
const defaultSiteDescription =
  "Lectum conecta pacientes e psicólogos em uma comunidade de perguntas e respostas sobre saúde mental.";

export const SITE_DESCRIPTION =
  configuredSiteDescription && configuredSiteDescription !== "Frontend Lectum"
    ? configuredSiteDescription
    : defaultSiteDescription;

export const COMMUNITY_FEED_DESCRIPTION =
  "Feed público da Lectum com perguntas, relatos e respostas de psicólogos em comunidades de saúde mental.";

export const PUBLIC_INDEXABLE_ROUTES = [
  {
    path: "/",
    changeFrequency: "daily" as const,
    priority: 1,
  },
  {
    path: PUBLIC_PSYCHOLOGISTS_HREF,
    changeFrequency: "daily" as const,
    priority: 0.9,
  },
  {
    path: PUBLIC_COMMUNITIES_HREF,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  },
  {
    path: PUBLIC_TOP_MENTORS_HREF,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },
];

export const NON_INDEXABLE_ROUTES = [
  "/app/",
  "/auth/",
  "/dashboard/",
  "/patient/",
  "/paciente/",
  "/psychologist/cfp/",
  "/api/",
];

export const AI_SEARCH_USER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
];

export const AI_TRAINING_USER_AGENTS = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
];

export const NON_INDEXABLE_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

export const getSiteUrl = () => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_WEB_URL || DEFAULT_SITE_URL;
  const source = parsePublicAssetSource(configuredUrl);

  if (!source || !isAllowedPublicAssetSource(source, process.env.NODE_ENV)) {
    return new URL(DEFAULT_SITE_URL);
  }

  return new URL(source.origin);
};

export const absoluteUrl = (path = "/") => {
  const siteUrl = getSiteUrl();
  const rawPath = path.trim();
  const normalizedPath =
    rawPath.startsWith("/") && !rawPath.startsWith("//") && !rawPath.includes("\\")
      ? rawPath
      : `/${rawPath.replace(/^\/+/, "").replaceAll("\\", "/")}`;

  return new URL(normalizedPath, siteUrl).toString();
};
