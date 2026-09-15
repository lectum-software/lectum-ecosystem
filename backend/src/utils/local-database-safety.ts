import { isDisposableRuntime, isPublishedRuntime } from "./runtime-config";

export type LocalDatabaseEnvironment = {
  DATABASE_URL?: string;
  NODE_ENV?: string;
};

const LOCAL_DATABASE_HOSTS = new Set([
  "127.0.0.1",
  "::1",
  "database",
  "db",
  "host.docker.internal",
  "localhost",
  "postgres",
  "postgresql",
]);

const PUBLISHED_TARGET_PATTERN =
  /(^|[^a-z])(homolog(?:ation)?|homol|hml|prod|production|prd|stag(?:e|ing)?|stg)([^a-z]|$)/i;

export const assertDisposableLocalDatabaseTarget = (
  environment: LocalDatabaseEnvironment = process.env,
  operation = "Operação",
) => {
  const nodeEnv = environment.NODE_ENV?.trim().toLowerCase();
  if (isPublishedRuntime(nodeEnv)) {
    throw new Error(`${operation} bloqueada em ambiente publicado.`);
  }
  if (!isDisposableRuntime(nodeEnv)) {
    throw new Error(`${operation} bloqueada: ambiente descartável não identificado.`);
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(environment.DATABASE_URL ?? "");
  } catch {
    throw new Error(`${operation} bloqueada: banco local não identificado.`);
  }

  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
    throw new Error(`${operation} bloqueada: banco local não identificado.`);
  }

  const targetLabel = `${databaseUrl.hostname} ${databaseUrl.pathname}`;
  if (PUBLISHED_TARGET_PATTERN.test(targetLabel)) {
    throw new Error(`${operation} bloqueada para alvo de homologação ou produção.`);
  }

  if (!LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname.toLowerCase())) {
    throw new Error(`${operation} bloqueada: somente bancos locais são aceitos.`);
  }
};
