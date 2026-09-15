"use client";

import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import { isAllowedPublicAssetSource, parsePublicAssetSource } from "@/utils/public-asset-sources";
import { normalizeSafeInternalRedirect } from "@/utils/safe-redirect";

export const ADMIN_VIEW_AS_STORAGE_KEY = "lectum.adminViewAs";
export const ADMIN_VIEW_AS_STORAGE_EVENT = "lectum:admin-view-as-change";
export const ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE = "admin_view_as_read_only";
const MAX_ADMIN_VIEW_AS_STORAGE_LENGTH = 8192;
const MAX_ADMIN_VIEW_AS_ID_LENGTH = 128;
const MAX_ADMIN_VIEW_AS_NAME_LENGTH = 160;
const MAX_ADMIN_VIEW_AS_DATE_LENGTH = 64;
const MAX_ADMIN_VIEW_AS_URL_LENGTH = 2048;

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export type AdminViewAsSession = {
  adminReturnUrl?: string | null;
  expiresAt?: string | null;
  mode: "admin_view_as";
  readOnly: true;
  startPath?: string | null;
  startedAt: string;
  subjectId: string;
  subjectName: string;
  subjectRole: "paciente" | "psicologo";
};

const notifyAdminViewAsChange = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(ADMIN_VIEW_AS_STORAGE_EVENT));
};

export const normalizeAdminReturnUrl = (value?: string | null) => {
  if (
    !value ||
    value.length > MAX_ADMIN_VIEW_AS_URL_LENGTH ||
    value.startsWith("//") ||
    value.includes("\\") ||
    hasControlCharacters(value)
  ) {
    return null;
  }

  const internalPath = normalizeSafeInternalRedirect(value);
  if (internalPath) return internalPath;

  const configuredAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (!configuredAdminUrl || !value) return null;

  try {
    const configuredSource = parsePublicAssetSource(configuredAdminUrl);
    if (!configuredSource || !isAllowedPublicAssetSource(configuredSource, process.env.NODE_ENV)) {
      return null;
    }

    const candidate = new URL(value);

    return (candidate.protocol === "http:" || candidate.protocol === "https:") &&
      candidate.origin === configuredSource.origin &&
      !candidate.username &&
      !candidate.password
      ? candidate.toString()
      : null;
  } catch {
    return null;
  }
};

export const getAdminViewAsExpirationDelay = (expiresAt?: string | null, now = Date.now()) => {
  if (!expiresAt) return null;

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return 0;

  return Math.max(0, expiresAtMs - now);
};

const isExpired = (expiresAt?: string | null) => getAdminViewAsExpirationDelay(expiresAt) === 0;

const isValidDateString = (value: unknown) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_ADMIN_VIEW_AS_DATE_LENGTH &&
  Number.isFinite(Date.parse(value));

const isValidBoundedString = (value: unknown, maxLength: number) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maxLength &&
  !hasControlCharacters(value);

const isValidSession = (value: Partial<AdminViewAsSession>): value is AdminViewAsSession =>
  value.mode === "admin_view_as" &&
  value.readOnly === true &&
  (value.subjectRole === "paciente" || value.subjectRole === "psicologo") &&
  isValidBoundedString(value.subjectId, MAX_ADMIN_VIEW_AS_ID_LENGTH) &&
  isValidBoundedString(value.subjectName, MAX_ADMIN_VIEW_AS_NAME_LENGTH) &&
  isValidDateString(value.startedAt) &&
  (value.expiresAt === undefined ||
    value.expiresAt === null ||
    isValidDateString(value.expiresAt)) &&
  (value.startPath === undefined ||
    value.startPath === null ||
    (value.startPath.length <= MAX_ADMIN_VIEW_AS_URL_LENGTH &&
      Boolean(normalizeSafeInternalRedirect(value.startPath)))) &&
  (value.adminReturnUrl === undefined ||
    value.adminReturnUrl === null ||
    value.adminReturnUrl.length <= MAX_ADMIN_VIEW_AS_URL_LENGTH);

const getObjectCode = (value: unknown) => {
  if (!value || typeof value !== "object" || !("code" in value)) return null;

  const code = (value as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

export const isAdminViewAsReadOnlyError = (error: unknown) => {
  const directCode = getObjectCode(error);
  if (directCode === ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE) return true;

  if (!error || typeof error !== "object") return false;

  const dataCode = getObjectCode((error as { data?: unknown }).data);
  if (dataCode === ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE) return true;

  const responseCode = getObjectCode((error as { response?: { data?: unknown } }).response?.data);
  return responseCode === ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE;
};

export const readAdminViewAsSession = (): AdminViewAsSession | null => {
  const sessionStorage = getBrowserStorage("sessionStorage");
  const localStorage = getBrowserStorage("localStorage");
  const raw =
    readStorageItem(sessionStorage, ADMIN_VIEW_AS_STORAGE_KEY) ??
    readStorageItem(localStorage, ADMIN_VIEW_AS_STORAGE_KEY);

  if (!raw || raw.length > MAX_ADMIN_VIEW_AS_STORAGE_LENGTH) {
    if (raw) clearAdminViewAsSession();
    return null;
  }

  removeStorageItem(localStorage, ADMIN_VIEW_AS_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<AdminViewAsSession>;
    if (!isValidSession(parsed) || isExpired(parsed.expiresAt)) {
      clearAdminViewAsSession();
      return null;
    }

    return {
      adminReturnUrl: normalizeAdminReturnUrl(parsed.adminReturnUrl),
      expiresAt: parsed.expiresAt ?? null,
      mode: "admin_view_as",
      readOnly: true,
      startPath: normalizeSafeInternalRedirect(parsed.startPath),
      startedAt: parsed.startedAt,
      subjectId: parsed.subjectId.trim(),
      subjectName: parsed.subjectName.trim(),
      subjectRole: parsed.subjectRole,
    };
  } catch {
    clearAdminViewAsSession();
    return null;
  }
};

export const writeAdminViewAsSession = (session: AdminViewAsSession) => {
  if (!isValidSession(session) || isExpired(session.expiresAt)) return false;

  const localStorage = getBrowserStorage("localStorage");
  const sessionStorage = getBrowserStorage("sessionStorage");
  let serialized: string;

  try {
    serialized = JSON.stringify({
      ...session,
      adminReturnUrl: normalizeAdminReturnUrl(session.adminReturnUrl),
      startPath: normalizeSafeInternalRedirect(session.startPath),
      subjectId: session.subjectId.trim(),
      subjectName: session.subjectName.trim(),
    });
  } catch {
    return false;
  }

  if (serialized.length > MAX_ADMIN_VIEW_AS_STORAGE_LENGTH) return false;

  removeStorageItem(localStorage, ADMIN_VIEW_AS_STORAGE_KEY);
  const written = writeStorageItem(sessionStorage, ADMIN_VIEW_AS_STORAGE_KEY, serialized);
  if (!written || readStorageItem(sessionStorage, ADMIN_VIEW_AS_STORAGE_KEY) !== serialized) {
    return false;
  }

  notifyAdminViewAsChange();
  return true;
};

export const clearAdminViewAsSession = () => {
  const localStorage = getBrowserStorage("localStorage");
  const sessionStorage = getBrowserStorage("sessionStorage");

  removeStorageItem(localStorage, ADMIN_VIEW_AS_STORAGE_KEY);
  removeStorageItem(sessionStorage, ADMIN_VIEW_AS_STORAGE_KEY);

  notifyAdminViewAsChange();
};

export const isAdminViewAsActive = () => Boolean(readAdminViewAsSession());
