import type { Metadata } from "next";

const DEFAULT_SITE_URL = "http://localhost:3000";

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
    path: "/psychologists",
    changeFrequency: "daily" as const,
    priority: 0.9,
  },
  {
    path: "/community",
    changeFrequency: "weekly" as const,
    priority: 0.8,
  },
  {
    path: "/community/top-mentors",
    changeFrequency: "weekly" as const,
    priority: 0.7,
  },
];

export const NON_INDEXABLE_ROUTES = [
  "/app/",
  "/auth/",
  "/dashboard/",
  "/patient/",
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

const normalizeUrl = (value: string) => {
  const url = value.trim();

  if (!url) return DEFAULT_SITE_URL;

  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const getSiteUrl = () => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_WEB_URL || DEFAULT_SITE_URL;

  try {
    return new URL(normalizeUrl(configuredUrl));
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
};

export const absoluteUrl = (path = "/") => {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return new URL(normalizedPath, siteUrl).toString();
};
