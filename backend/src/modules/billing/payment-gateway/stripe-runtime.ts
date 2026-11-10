import { isDisposableRuntime, isPublishedRuntime } from "../../../utils/runtime-config";
import type { StripeMode } from "./stripe-types";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
const NON_PRODUCTION_DATABASE = /(?:homol|staging|(?:^|[_-])(?:dev|test|local)(?:[_-]|$))/i;
const PRODUCTION_DATABASE = /(?:^|[_-])(?:prod|production)(?:[_-]|$)/i;
const HOMOLOG_DATABASE = /(?:^|[_-])(?:homol|homolog|homologacao|staging|hml)(?:[_-]|$)/i;

/** Explicit runtime boundaries, parallel to fiscal gates; never make live keys work in local QA. */
export const isStripeRuntimeAllowed = (mode: StripeMode, env = process.env): boolean => {
  try {
    const base = new URL(env.BASE ?? "");
    const database = new URL(env.DATABASE_URL ?? "");
    const databaseName = decodeURIComponent(database.pathname.slice(1));
    if (
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      !database.hostname ||
      !databaseName ||
      databaseName.includes("/") ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      base.pathname !== "/"
    )
      return false;
    if (mode === "live") {
      return (
        env.NODE_ENV === "production" &&
        base.origin === "https://api.lectum.com.br" &&
        !LOOPBACK.has(database.hostname) &&
        !NON_PRODUCTION_DATABASE.test(databaseName)
      );
    }
    if (PRODUCTION_DATABASE.test(databaseName)) return false;
    const local =
      isDisposableRuntime(env.NODE_ENV ?? "") &&
      ["http:", "https:"].includes(base.protocol) &&
      LOOPBACK.has(base.hostname) &&
      LOOPBACK.has(database.hostname) &&
      NON_PRODUCTION_DATABASE.test(databaseName) &&
      !/(homol|staging)/i.test(databaseName);
    const homolog =
      isPublishedRuntime(env.NODE_ENV ?? "") &&
      base.origin === "https://homolog-api.lectum.com.br" &&
      !LOOPBACK.has(database.hostname) &&
      HOMOLOG_DATABASE.test(databaseName);
    return local || homolog;
  } catch {
    return false;
  }
};
