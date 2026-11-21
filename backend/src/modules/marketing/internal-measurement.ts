import type { NextFunction, Request, Response } from "express";
import { USER_AUTH_COOKIE_NAME } from "@/utils/user-auth-cookie";
import { MarketingConsentRepository } from "./consent-repository";

// Optional authentication may keep contact access available after a failed login.
// That fallback must not turn an unresolved account into consented guest measurement.
export function guardMeasurementIdentity(req: Request, _res: Response, next: NextFunction) {
  const hasCredentials =
    req.headers.authorization !== undefined ||
    Object.hasOwn(req.cookies ?? {}, USER_AUTH_COOKIE_NAME) ||
    (req.headers.cookie ?? "").split(";").some((part) => {
      const name = part.split("=", 1)[0].trim();
      return name === USER_AUTH_COOKIE_NAME;
    });
  if (!req.auth?.id && hasCredentials && req.body && typeof req.body === "object") {
    req.body.measurement_allowed = false;
  }
  next();
}

export async function allowsInternalMeasurement(
  accepted: unknown,
  userId?: string | null,
  readStatus = (id: string) => new MarketingConsentRepository().status(id),
) {
  if (accepted !== true) return false;
  if (!userId) return true;
  try {
    return (await readStatus(userId)).granted === true;
  } catch {
    return false;
  }
}
