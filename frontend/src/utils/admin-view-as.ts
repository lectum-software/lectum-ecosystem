"use client";

export const ADMIN_VIEW_AS_STORAGE_KEY = "lectum.adminViewAs";
export const ADMIN_VIEW_AS_STORAGE_EVENT = "lectum:admin-view-as-change";
export const ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE = "admin_view_as_read_only";

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

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;

  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
};

const isValidSession = (value: Partial<AdminViewAsSession>): value is AdminViewAsSession =>
  value.mode === "admin_view_as" &&
  value.readOnly === true &&
  (value.subjectRole === "paciente" || value.subjectRole === "psicologo") &&
  typeof value.subjectId === "string" &&
  value.subjectId.length > 0 &&
  typeof value.subjectName === "string" &&
  value.subjectName.length > 0 &&
  typeof value.startedAt === "string" &&
  value.startedAt.length > 0;

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
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_VIEW_AS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AdminViewAsSession>;
    if (!isValidSession(parsed) || isExpired(parsed.expiresAt)) {
      clearAdminViewAsSession();
      return null;
    }

    return parsed;
  } catch {
    clearAdminViewAsSession();
    return null;
  }
};

export const writeAdminViewAsSession = (session: AdminViewAsSession) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ADMIN_VIEW_AS_STORAGE_KEY, JSON.stringify(session));
  notifyAdminViewAsChange();
};

export const clearAdminViewAsSession = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ADMIN_VIEW_AS_STORAGE_KEY);
  notifyAdminViewAsChange();
};

export const isAdminViewAsActive = () => Boolean(readAdminViewAsSession());
