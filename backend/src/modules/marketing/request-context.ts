import { AsyncLocalStorage } from "node:async_hooks";
import { isIP } from "node:net";
import type { RequestHandler } from "express";
import { z } from "zod";

export const marketingUserAgentSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[\x20-\x7e]+$/);
export const marketingIpSchema = z
  .string()
  .max(45)
  .refine((value) => isIP(value) !== 0);
type Context = { startedAt: number; read: () => { userAgent?: string; ip?: string } };
const storage = new AsyncLocalStorage<Context>();

// Headers are read only after the outbox verifies prior, current consent.
export const marketingRequestContext: RequestHandler = (req, _res, next) => {
  if (req.path.includes("/webhook") || req.path.startsWith("/api/admin/")) return next();
  storage.run(
    {
      startedAt: Date.now(),
      read: () => ({
        userAgent: req.get("user-agent"),
        // Verify the proxy chain before enabling. Never parse arbitrary forwarded
        // headers or substitute the backend's outbound address.
        ip:
          process.env.META_CLIENT_IP_VERIFIED === "true" && req.app.get("trust proxy") !== true
            ? req.ip
            : undefined,
      }),
    },
    next,
  );
};

export function readMarketingRequestContext(occurredAt: Date, now = new Date()) {
  const context = storage.getStore();
  if (
    !context ||
    occurredAt.getTime() < context.startedAt ||
    now.getTime() - context.startedAt > 120_000 ||
    occurredAt > now
  )
    return {};
  const values = context.read();
  const agent = marketingUserAgentSchema.safeParse(values.userAgent);
  const ip = marketingIpSchema.safeParse(values.ip);
  return {
    ...(agent.success ? { client_user_agent: agent.data } : {}),
    ...(ip.success ? { client_ip_address: ip.data } : {}),
  };
}
