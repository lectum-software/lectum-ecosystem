import type { JwtPayload } from "jsonwebtoken";
import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy, type VerifiedCallback } from "passport-jwt";
import prisma from "@/infra/database/prisma";
import {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  getAdminJwtSecret,
} from "@/modules/api/admin/shared/auth/jwt";

const notAuthorized = { status: 401 };

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
      audience: ADMIN_JWT_AUDIENCE,
      issuer: ADMIN_JWT_ISSUER,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
    },
  ),
);

export default passport;
