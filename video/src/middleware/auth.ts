import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { VideoServiceConfig } from "../config/env.js";
import { sendPublicError } from "../http/responses.js";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

export const bearerTokenMatches = (authorization: string | undefined, expected: string) => {
  if (!authorization?.startsWith("Bearer ")) return false;
  const candidate = authorization.slice("Bearer ".length);
  if (!candidate || candidate.length > 1_024) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
};

export const createServiceAuthentication =
  (config: VideoServiceConfig) => (request: Request, response: Response, next: NextFunction) => {
    if (!bearerTokenMatches(request.header("authorization"), config.apiKey)) {
      response.setHeader("WWW-Authenticate", "Bearer");
      sendPublicError(response, 401, "unauthorized", "Acesso não autorizado.");
      return;
    }

    next();
  };
