//Libs

import { differenceInHours } from "date-fns";
import dotenv from "dotenv";
//Types
import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { ExtractJwt, Strategy as JWTStrategy, type VerifiedCallback } from "passport-jwt";
import { error, msg } from "@/helpers/translate";
//Interfaces
import type { user } from "@/interfaces/objects";
//Repositories
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
//Emits
import { emit_hidrate } from "./emit";

dotenv.config();

const TOKEN_API_USER = Number(process.env.TOKEN_API_USER_HIDRATE_HOURS);
const notAuthorized = { status: 401 };

passport.serializeUser<user>((user, done) => {
  done(null, user);
});

passport.deserializeUser<user>(async (auth, done) => {
  try {
    const repo = new LoginRepository();
    const user = await repo.findByEmail({ b: { email: auth.email! } });
    done(null, user);
  } catch (err) {
    done(err as Error, null);
  }
});

// Estratégia Google
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID_API_USER!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_API_USER!,
      callbackURL: `${process.env.BASE}/api/public/google/callback`,
      passReqToCallback: true,
    },
    async (req: Request, _accessToken: string, _refreshToken: string, profile: Profile, done) => {
      try {
        let device_id = req.query.state as string;

        try {
          const stateObj = JSON.parse(device_id);
          if (stateObj && typeof stateObj === "object" && stateObj.device_id) {
            device_id = stateObj.device_id;
          }
        } catch (e) {
          console.log(e);
        }
        //

        if (!device_id)
          return done(null, {
            status: 404,
            ...error("device_id_not_found", {}),
            type: 3,
          });

        const email = profile.emails?.[0]?.value;
        if (!email)
          return done(null, {
            status: 404,
            ...error("google_email_not_authorized", {}),
            type: 3,
          });

        const repo = new LoginRepository(device_id, [
          { model: "company", columns: ["ai_api_key"] },
        ]);
        let user = await repo.findByEmail({ b: { email } });

        if (!user) {
          user = await repo.store({
            b: {
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value,
              provider: "google",
            },
          });
        }

        if (!user)
          return done(null, {
            status: 404,
            ...error("not_found", {}),
            type: 3,
          });

        user = await repo.hidrate(user, device_id);

        return done(null, {
          ...msg("login_success", {}),
          data: user,
        });
      } catch (err) {
        const e = err as Error;
        return done(null, {
          status: 404,
          ...error("google_unexpected_error", {
            message: e.message,
          }),
          type: 3,
        });
      }
    },
  ),
);

// Estratégia JWT
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY || "development-secret",
};

passport.use(
  "jwt-user-api",
  new JWTStrategy(jwtOptions, async (payload: JwtPayload, done: VerifiedCallback) => {
    const repo = new LoginRepository(payload.device_id, [
      { model: "company", columns: ["ai_api_key"] },
    ]);
    let user = await repo.findByEmail({ b: { email: payload.email } });

    if (user?.active) {
      const createdIn = new Date((payload.iat || 0) * 1000);
      const diff = differenceInHours(new Date(), createdIn);

      if (diff > TOKEN_API_USER) {
        try {
          user = await repo.hidrate(user, payload.device_id);
          emit_hidrate(user, payload.device_id);
        } catch (_e) {
          return done(notAuthorized, false);
        }
      }

      return done(null, user);
    } else {
      return done(notAuthorized, false);
    }
  }),
);

export { generateToken } from "./utils/generateToken";
export default passport;
