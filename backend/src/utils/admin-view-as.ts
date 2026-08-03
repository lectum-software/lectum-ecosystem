import { createId } from "@paralleldrive/cuid2";
import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";

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

const bearerTokenFromRequest = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  return authHeader.split(" ")[1] || null;
};

export const getAdminViewAsPayloadFromRequest = (req: Request): AdminViewAsJwtPayload | null => {
  const token = bearerTokenFromRequest(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminViewAsJwtPayload;
    if (payload.type !== "user" || !isAdminViewAsDeviceId(payload.device_id)) return null;

    return payload;
  } catch {
    return null;
  }
};

export const isSafeAdminViewAsMethod = (method: string) =>
  ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());

export const shouldBlockAdminViewAsWrite = (req: Request) => {
  if (isSafeAdminViewAsMethod(req.method)) return false;

  return Boolean(getAdminViewAsPayloadFromRequest(req));
};
