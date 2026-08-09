import { createId } from "@paralleldrive/cuid2";
import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getJwtSecret, JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { getUserRequestToken } from "@/utils/user-auth-cookie";

export const ADMIN_VIEW_AS_DEVICE_PREFIX = "admin_view_as:";
export const ADMIN_VIEW_AS_TOKEN_TTL_SECONDS = 30 * 60;

export type AdminViewAsTargetRole = "paciente" | "psicologo";

export type AdminViewAsJwtPayload = JwtPayload & {
  device_id?: string;
  email?: string;
  id?: string;
  type?: string;
};

export const isAdminViewAsDeviceId = (deviceId?: string | null) =>
  Boolean(deviceId?.startsWith(ADMIN_VIEW_AS_DEVICE_PREFIX));

export const buildAdminViewAsDeviceId = ({
  adminId,
  targetId,
  targetRole,
}: {
  adminId: string;
  targetId: string;
  targetRole: AdminViewAsTargetRole;
}) => `${ADMIN_VIEW_AS_DEVICE_PREFIX}${targetRole}:${adminId}:${targetId}:${createId()}`;

export const getAdminViewAsPayloadFromRequest = (req: Request): AdminViewAsJwtPayload | null => {
  const token = getUserRequestToken(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    }) as AdminViewAsJwtPayload;
    if (payload.type !== "user" || !isAdminViewAsDeviceId(payload.device_id)) return null;

    return payload;
  } catch {
    return null;
  }
};

export const isSafeAdminViewAsMethod = (method: string) =>
  ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export const isAdminViewAsLogoutRequest = (req: Request) => {
  if (req.method.toUpperCase() !== "POST") return false;

  const rawUrl = req.originalUrl || req.url;
  const queryIndex = rawUrl.indexOf("?");
  const pathname = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);

  return pathname === "/api/private/account/logout";
};

export const isSafeAdminViewAsRequest = (req: Request) =>
  isSafeAdminViewAsMethod(req.method) || isAdminViewAsLogoutRequest(req);

export const shouldBlockAdminViewAsWrite = (
  req: Request,
  payload = getAdminViewAsPayloadFromRequest(req),
) => {
  if (isSafeAdminViewAsRequest(req)) return false;

  return Boolean(payload);
};

export const resolveUserRequestDeviceId = (
  req: Request,
  browserDeviceId: string,
  payload = getAdminViewAsPayloadFromRequest(req),
) => payload?.device_id || browserDeviceId;
