//Libs

import { differenceInHours } from "date-fns";
import dotenv from "dotenv";
//Types
import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { ExtractJwt, Strategy as JWTStrategy, type VerifiedCallback } from "passport-jwt";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
//Interfaces
import type { user } from "@/interfaces/objects";
//Repositories
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import { getGoogleOAuthCallbackUrl } from "@/modules/api/public/google/utils/config";
import {
  buildProfessionalFullDisplayName,
  normalizeProfessionalNamePart,
  splitProfessionalNameFallback,
} from "@/utils/professional-name";
//Emits
import { emit_hidrate } from "./emit";
import { getJwtSecret } from "./utils/jwt-secret";

dotenv.config();

const TOKEN_API_USER = Number(process.env.TOKEN_API_USER_HIDRATE_HOURS);
const notAuthorized = { status: 401 };
const allowedUserRoles = ["paciente", "psicologo"] as const;

type UserRole = (typeof allowedUserRoles)[number];
type GoogleLinkPayload = JwtPayload & {
  device_id?: string;
  email?: string;
  intent?: string;
  user_id?: string;
};
type GoogleDeleteAccountPayload = GoogleLinkPayload;

const parseUserRole = (role: unknown): UserRole | undefined => {
  if (typeof role !== "string") return undefined;

  return allowedUserRoles.includes(role as UserRole) ? (role as UserRole) : undefined;
};

const inactiveUserResponse = () => ({
  status: 400,
  ...error("auth_inactive", {}),
  type: 3,
});

const resolveGoogleProfessionalNameParts = (profile: Profile) => {
  const fallback = splitProfessionalNameFallback(profile.displayName);
  const profileJson = (profile._json ?? {}) as {
    family_name?: string | null;
    given_name?: string | null;
  };
  const firstName = normalizeProfessionalNamePart(profileJson.given_name) || fallback.firstName;
  const lastName = normalizeProfessionalNamePart(profileJson.family_name) || fallback.lastName;

  return {
    firstName,
    lastName,
  };
};

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
      callbackURL: getGoogleOAuthCallbackUrl(),
      passReqToCallback: true,
    },
    async (req: Request, _accessToken: string, _refreshToken: string, profile: Profile, done) => {
      try {
        let device_id = req.query.state as string;
        let deleteToken: string | undefined;
        let intent: string | undefined;
        let linkToken: string | undefined;
        let role: UserRole | undefined;
        let termsAccepted = false;
        let termsVersion: string | undefined;

        try {
          const stateObj = JSON.parse(device_id);
          if (stateObj && typeof stateObj === "object" && stateObj.device_id) {
            device_id = stateObj.device_id;
            role = parseUserRole(stateObj.query?.role);
            termsAccepted =
              stateObj.query?.terms_accepted === "true" || stateObj.query?.terms_accepted === true;
            termsVersion =
              typeof stateObj.query?.terms_version === "string"
                ? stateObj.query.terms_version
                : undefined;
            intent = typeof stateObj.query?.intent === "string" ? stateObj.query.intent : undefined;
            linkToken =
              typeof stateObj.query?.link_token === "string"
                ? stateObj.query.link_token
                : undefined;
            deleteToken =
              typeof stateObj.query?.delete_token === "string"
                ? stateObj.query.delete_token
                : undefined;
          }
        } catch (e) {
          console.warn("[GOOGLE] Estado OAuth inv?lido ou ausente.", {
            message: e instanceof Error ? e.message : "unknown",
          });
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

        const googleDisplayName = profile.displayName?.trim();
        const googleProfessionalName = resolveGoogleProfessionalNameParts(profile);
        const googleName = googleDisplayName;
        const googleAvatar = profile.photos?.[0]?.value;
        const googleNameForRole = (targetRole?: string | null) =>
          targetRole === "psicologo"
            ? buildProfessionalFullDisplayName({
                fallbackName: googleDisplayName || email,
                firstName: googleProfessionalName.firstName,
                lastName: googleProfessionalName.lastName,
              })
            : googleDisplayName || email;

        const repo = new LoginRepository(device_id, [
          { model: "company", columns: ["ai_api_key"] },
        ]);

        if (intent === "link") {
          if (!linkToken) {
            return done(null, {
              status: 400,
              ...error("google_link_invalid", {}),
              type: 3,
            });
          }

          let payload: GoogleLinkPayload;

          try {
            payload = jwt.verify(linkToken, getJwtSecret()) as GoogleLinkPayload;
          } catch {
            return done(null, {
              status: 400,
              ...error("google_link_expired", {}),
              type: 3,
            });
          }

          if (
            payload.intent !== "link_google" ||
            payload.device_id !== device_id ||
            !payload.user_id ||
            !payload.email
          ) {
            return done(null, {
              status: 400,
              ...error("google_link_invalid", {}),
              type: 3,
            });
          }

          if (payload.email.toLowerCase() !== email.toLowerCase()) {
            return done(null, {
              status: 400,
              ...error("google_link_email_mismatch", {}),
              type: 3,
            });
          }

          let linkedUser = await repo.findByEmail({ b: { email: payload.email } });

          if (!linkedUser || linkedUser.id !== payload.user_id) {
            return done(null, {
              status: 404,
              ...error("account_not_found", {}),
              type: 3,
            });
          }

          linkedUser = await repo.reactivateExpiredSuspension(linkedUser);

          if (!linkedUser.active) {
            return done(null, inactiveUserResponse());
          }

          const profileUpdate: { avatar?: string | null; name?: string; provider?: string } = {
            provider: "google",
          };

          const linkedUserGoogleName = googleNameForRole(linkedUser.role);

          if (
            (googleName || linkedUser.role === "psicologo") &&
            (!linkedUser.name || linkedUser.provider === "google")
          ) {
            profileUpdate.name = linkedUserGoogleName;
          }

          if (googleAvatar && !linkedUser.avatar) {
            profileUpdate.avatar = googleAvatar;
          }

          linkedUser = await repo.update({
            p: { id: linkedUser.id! },
            b: profileUpdate,
            auth: linkedUser,
          });

          if (!linkedUser) {
            return done(null, {
              status: 404,
              ...error("account_not_found", {}),
              type: 3,
            });
          }

          if (
            linkedUser.id &&
            linkedUser.role === "psicologo" &&
            (googleProfessionalName.firstName || googleProfessionalName.lastName)
          ) {
            await prisma.psychologist_profile.updateMany({
              where: {
                user_id: linkedUser.id,
                deleted: false,
                OR: [
                  { professional_first_name: null },
                  { professional_first_name: "" },
                  { professional_last_name: null },
                  { professional_last_name: "" },
                ],
              },
              data: {
                professional_first_name: googleProfessionalName.firstName || undefined,
                professional_last_name: googleProfessionalName.lastName || undefined,
              },
            });
          }

          linkedUser = await repo.hidrate(linkedUser, device_id);

          return done(null, {
            ...msg("google_link_success", {}),
            data: linkedUser,
          });
        }

        if (intent === "delete_account") {
          if (!deleteToken) {
            return done(null, {
              status: 400,
              ...error("account_delete_google_reauth_invalid", {}),
              type: 3,
            });
          }

          let payload: GoogleDeleteAccountPayload;

          try {
            payload = jwt.verify(deleteToken, getJwtSecret()) as GoogleDeleteAccountPayload;
          } catch {
            return done(null, {
              status: 400,
              ...error("account_delete_google_reauth_expired", {}),
              type: 3,
            });
          }

          if (
            payload.intent !== "delete_account_google_reauth" ||
            payload.device_id !== device_id ||
            !payload.user_id ||
            !payload.email
          ) {
            return done(null, {
              status: 400,
              ...error("account_delete_google_reauth_invalid", {}),
              type: 3,
            });
          }

          if (payload.email.toLowerCase() !== email.toLowerCase()) {
            return done(null, {
              status: 400,
              ...error("account_delete_google_reauth_email_mismatch", {}),
              type: 3,
            });
          }

          let reauthUser = await repo.findByEmail({ b: { email: payload.email } });

          if (
            !reauthUser ||
            reauthUser.id !== payload.user_id ||
            reauthUser.provider !== "google"
          ) {
            return done(null, {
              status: 404,
              ...error("account_not_found", {}),
              type: 3,
            });
          }

          reauthUser = await repo.reactivateExpiredSuspension(reauthUser);

          if (!reauthUser.active) {
            return done(null, inactiveUserResponse());
          }

          const now = new Date();
          await prisma.user_background.create({
            data: {
              user_id: reauthUser.id!,
              type: "account_delete_reauth",
              device_id,
              data: {
                email,
                provider: "google",
                verified_at: now.toISOString(),
                expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
              },
            },
          });

          reauthUser = await repo.hidrate(reauthUser, device_id);

          return done(null, {
            ...msg("account_delete_google_reauth_success", {}),
            data: reauthUser,
          });
        }

        let user = await repo.findByEmail({ b: { email } });
        const isRegistrationIntent = intent === "register" || (Boolean(role) && termsAccepted);

        if (!user) {
          if (!isRegistrationIntent) {
            return done(null, {
              status: 404,
              ...error("account_not_registered", {}),
              type: 3,
            });
          }

          if (!role || !termsAccepted) {
            return done(null, {
              status: 400,
              ...error(!role ? "role_not_authorized" : "terms_required", {}),
              type: 3,
            });
          }

          user = await repo.store({
            b: {
              name: googleNameForRole(role),
              professional_first_name:
                role === "psicologo" ? googleProfessionalName.firstName : undefined,
              professional_last_name:
                role === "psicologo" ? googleProfessionalName.lastName : undefined,
              email,
              avatar: googleAvatar,
              provider: "google",
              role,
              terms_accepted: termsAccepted,
              terms_version: termsVersion,
            },
          });
        } else {
          user = await repo.reactivateExpiredSuspension(user);

          if (!user.active) {
            return done(null, inactiveUserResponse());
          }

          const profileUpdate: { name?: string; avatar?: string | null; provider?: string } = {};

          const userGoogleName = googleNameForRole(user.role);

          if (
            (googleName || user.role === "psicologo") &&
            (!user.name || user.provider === "google")
          ) {
            profileUpdate.name = userGoogleName;
          }

          if (googleAvatar && !user.avatar) {
            profileUpdate.avatar = googleAvatar;
          }

          if (user.provider !== "google") {
            profileUpdate.provider = "google";
          }

          if (Object.keys(profileUpdate).length > 0 && user.id) {
            user = await repo.update({
              p: { id: user.id },
              b: profileUpdate,
              auth: user,
            });
          }

          if (
            user?.id &&
            user.role === "psicologo" &&
            (googleProfessionalName.firstName || googleProfessionalName.lastName)
          ) {
            await prisma.psychologist_profile.updateMany({
              where: {
                user_id: user.id,
                deleted: false,
                OR: [
                  { professional_first_name: null },
                  { professional_first_name: "" },
                  { professional_last_name: null },
                  { professional_last_name: "" },
                ],
              },
              data: {
                professional_first_name: googleProfessionalName.firstName || undefined,
                professional_last_name: googleProfessionalName.lastName || undefined,
              },
            });
          }
        }

        if (!user)
          return done(null, {
            status: 404,
            ...error("not_found", {}),
            type: 3,
          });

        if (!user.active) {
          return done(null, inactiveUserResponse());
        }

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
  secretOrKey: getJwtSecret(),
};

passport.use(
  "jwt-user-api",
  new JWTStrategy(jwtOptions, async (payload: JwtPayload, done: VerifiedCallback) => {
    if (payload.type !== "user" || !payload.email || !payload.device_id) {
      return done(notAuthorized, false);
    }

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
