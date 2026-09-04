import { createHash } from "node:crypto";
import { R2_MIGRATION_SOURCE_PROVIDER, type R2MigrationPurpose } from "./types";

const SOURCE_PREFIXES: Record<R2MigrationPurpose, readonly string[]> = {
  community_post: ["posts/media/"],
  community_reply: ["posts/media/"],
  profile_presentation: ["psychologist/video/"],
};

const HOMOLOG_ENVIRONMENTS = new Set(["hml", "homol", "homolog", "homologation", "staging"]);
const PRODUCTION_ENVIRONMENTS = new Set(["prd", "prod", "production"]);

export type R2MigrationTargetEnvironment = "homolog" | "production";

export const isR2MigrationAsset = (asset: { source_provider?: string | null }) =>
  asset.source_provider === R2_MIGRATION_SOURCE_PROVIDER;

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const normalizeObjectKey = (value: string) => {
  const segments = value.split("/");
  if (
    !value ||
    value.length > 1_024 ||
    value.includes("\\") ||
    hasControlCharacter(value) ||
    !segments.every((segment) => segment && segment !== "." && segment !== "..")
  ) {
    return null;
  }

  return segments.join("/");
};

export const legacyR2ObjectKeyFromReference = (
  reference: string | null | undefined,
  purpose: R2MigrationPurpose,
) => {
  const raw = reference?.trim();
  if (!raw || raw.length > 4_096 || raw.startsWith("//") || raw.includes("\\")) return null;

  try {
    const url = new URL(raw, "https://lectum.invalid");
    if (url.username || url.password || url.search || url.hash) return null;

    const pathPrefix = "/public/files/";
    if (!url.pathname.startsWith(pathPrefix)) return null;

    const key = normalizeObjectKey(decodeURIComponent(url.pathname.slice(pathPrefix.length)));
    if (!key || !SOURCE_PREFIXES[purpose].some((prefix) => key.startsWith(prefix))) return null;

    return key;
  } catch {
    return null;
  }
};

export const createR2MigrationIdentity = (
  purpose: R2MigrationPurpose,
  targetId: string,
  sourceObjectKey: string,
) => {
  const migrationKey = createHash("sha256")
    .update("lectum-r2-stream-v1\0")
    .update(purpose)
    .update("\0")
    .update(targetId)
    .update("\0")
    .update(sourceObjectKey)
    .digest("hex");

  return {
    assetId: `r2m_${migrationKey.slice(0, 28)}`,
    migrationKey,
    migrationRef: migrationKey.slice(0, 12),
  };
};

const environmentFromName = (value: string | undefined) => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (HOMOLOG_ENVIRONMENTS.has(normalized)) return "homolog" as const;
  if (PRODUCTION_ENVIRONMENTS.has(normalized)) return "production" as const;
  return null;
};

const environmentFromUrl = (value: string | undefined) => {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    if (hostname !== "lectum.com.br" && !hostname.endsWith(".lectum.com.br")) return null;

    const labels = hostname.split(".");
    if (
      labels.some(
        (label) =>
          label === "homolog" ||
          label.startsWith("homolog-") ||
          label === "staging" ||
          label.startsWith("staging-"),
      )
    ) {
      return "homolog" as const;
    }
    return "production" as const;
  } catch {
    return null;
  }
};

export const resolveR2MigrationTargetEnvironment = (
  environment: NodeJS.ProcessEnv,
): R2MigrationTargetEnvironment | null => {
  const baseEnvironment = environmentFromUrl(environment.BASE);
  if (!baseEnvironment) return null;

  const urlSignals = [environment.BASE, ...(environment.WEB_URL?.split(",") ?? [])]
    .map(environmentFromUrl)
    .filter((value): value is R2MigrationTargetEnvironment => Boolean(value));
  const uniqueUrlSignals = new Set(urlSignals);
  if (uniqueUrlSignals.size > 1) return null;

  const sentryEnvironment = environmentFromName(environment.SENTRY_ENVIRONMENT);
  if (sentryEnvironment && baseEnvironment !== sentryEnvironment) return null;

  // NODE_ENV identifica o modo de execução da imagem, não o ambiente publicado.
  // Homologação e produção usam NODE_ENV=production, portanto esse sinal é
  // deliberadamente insuficiente para liberar uma operação com efeitos reais.
  return baseEnvironment;
};
