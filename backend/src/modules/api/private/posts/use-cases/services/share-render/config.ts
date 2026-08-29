import { existsSync } from "node:fs";
import path from "node:path";
import { parsePositiveInteger } from "@/utils/runtime-config";

const DEFAULT_SHARE_RENDER_TIMEOUT_MS = 45_000;
const DEFAULT_SHARE_RENDER_SOURCE_MAX_MB = 90;
const DEFAULT_SHARE_RENDER_CONCURRENCY = 1;
const DEFAULT_SHARE_RENDER_QUEUE_SIZE = 2;

export type ShareChromiumConfig = {
  concurrency: number;
  enabled: boolean;
  executablePath: string | null;
  queueSize: number;
  sourceMaxBytes: number;
  timeoutMs: number;
};

const normalizeBooleanFlag = (value: unknown, fallback: boolean) => {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "sim", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "nao", "não", "off"].includes(normalized)) return false;

  return fallback;
};

const firstExistingPath = (candidates: string[]) =>
  candidates.find((candidate) => {
    try {
      return existsSync(candidate);
    } catch {
      return false;
    }
  }) ?? null;

const compactPaths = (paths: Array<string | undefined>) =>
  paths.filter((candidate): candidate is string => Boolean(candidate?.trim()));

export const resolveShareChromiumExecutablePath = (
  env: NodeJS.ProcessEnv = process.env,
): string | null => {
  const explicit = env.LECTUM_SHARE_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (explicit) return explicit;

  const linuxCandidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];
  const windowsCandidates = compactPaths([
    env.ProgramFiles
      ? path.join(env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    env["ProgramFiles(x86)"]
      ? path.join(env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    env.LOCALAPPDATA
      ? path.join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    env.ProgramFiles
      ? path.join(env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe")
      : undefined,
    env["ProgramFiles(x86)"]
      ? path.join(env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe")
      : undefined,
  ]);

  return firstExistingPath([...linuxCandidates, ...windowsCandidates]);
};

export const resolveShareChromiumConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ShareChromiumConfig => {
  const sourceMaxMb = parsePositiveInteger(
    env.LECTUM_SHARE_CHROMIUM_SOURCE_MAX_MB,
    DEFAULT_SHARE_RENDER_SOURCE_MAX_MB,
    { max: 250, min: 1 },
  );

  return {
    concurrency: parsePositiveInteger(
      env.LECTUM_SHARE_CHROMIUM_CONCURRENCY,
      DEFAULT_SHARE_RENDER_CONCURRENCY,
      { max: 2, min: 1 },
    ),
    enabled: normalizeBooleanFlag(env.LECTUM_SHARE_CHROMIUM_ENABLED, true),
    executablePath: resolveShareChromiumExecutablePath(env),
    queueSize: parsePositiveInteger(
      env.LECTUM_SHARE_CHROMIUM_QUEUE_SIZE,
      DEFAULT_SHARE_RENDER_QUEUE_SIZE,
      { max: 10, min: 0 },
    ),
    sourceMaxBytes: sourceMaxMb * 1024 * 1024,
    timeoutMs: parsePositiveInteger(
      env.LECTUM_SHARE_CHROMIUM_TIMEOUT_MS,
      DEFAULT_SHARE_RENDER_TIMEOUT_MS,
      { max: 180_000, min: 10_000 },
    ),
  };
};
