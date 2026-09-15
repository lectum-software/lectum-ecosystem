import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { getAdminJwtTtlSeconds } from "@/utils/runtime-config";

export const ADMIN_JWT_AUDIENCE = "lectum-admin";
export const ADMIN_JWT_ISSUER = "lectum-api";

export type AdminJwtPayload = {
  device_id: string;
  email: string;
  id: string;
  randomId: string;
  type: "admin";
};

export const getAdminJwtSecret = () => {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET_NOT_CONFIGURED");
  }

  const userSecret = process.env.JWT_SECRET_KEY?.trim();
  if (userSecret && secret === userSecret) {
    throw new Error("ADMIN_JWT_SECRET_MUST_BE_DIFFERENT");
  }

  return secret;
};

export const assertAdminJwtConfigured = () => {
  getAdminJwtSecret();
};

export const signAdminJwt = (payload: AdminJwtPayload, options: SignOptions = {}) => {
  return jwt.sign(payload, getAdminJwtSecret(), {
    audience: ADMIN_JWT_AUDIENCE,
    expiresIn: getAdminJwtTtlSeconds(),
    issuer: ADMIN_JWT_ISSUER,
    ...options,
    algorithm: JWT_ALGORITHM,
  });
};
