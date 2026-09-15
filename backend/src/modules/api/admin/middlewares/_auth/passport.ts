import type { JwtPayload } from "jsonwebtoken";
import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy, type VerifiedCallback } from "passport-jwt";
import prisma from "@/infra/database/prisma";
import { getAdminRequestToken } from "@/modules/api/admin/shared/auth/cookie";
import {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  getAdminJwtSecret,
} from "@/modules/api/admin/shared/auth/jwt";
import { JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { getAdminJwtTtlSeconds } from "@/utils/runtime-config";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const notAuthorized = { status: 401 };
const authUnavailable = { message: "admin_auth_unavailable", status: 503 };

type AdminPayload = JwtPayload & {
  device_id?: string;
  email?: string;
  id?: string;
  type?: string;
};

passport.use(
  "jwt-admin-api",
  new JWTStrategy(
    {
      algorithms: [JWT_ALGORITHM],
      audience: ADMIN_JWT_AUDIENCE,
      issuer: ADMIN_JWT_ISSUER,
      jsonWebTokenOptions: {
        maxAge: getAdminJwtTtlSeconds(),
      },
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        getAdminRequestToken,
      ]),
      secretOrKeyProvider: (_request, _rawJwtToken, done) => {
        try {
          done(null, getAdminJwtSecret());
        } catch (error) {
          done(error, undefined);
        }
      },
    },
    async (payload: AdminPayload, done: VerifiedCallback) => {
      if (payload.type !== "admin" || !payload.id || !payload.email || !payload.device_id) {
        return done(notAuthorized, false);
      }

      try {
        const admin = await prisma.admin.findFirst({
          where: {
            active: true,
            deleted: false,
            email: payload.email,
            id: payload.id,
          },
          include: {
            admin_tokens: {
              where: {
                device_id: payload.device_id,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

        if (!admin) return done(notAuthorized, false);

        return done(null, admin);
      } catch (error) {
        console.error(
          "[ADMIN AUTH] Falha ao validar token administrativo.",
          toSafeErrorLog(error, "UnknownAdminAuthError"),
        );
        return done(authUnavailable, false);
      }
    },
  ),
);

export default passport;
