import { z } from "zod";
import {
  DISPOSABLE_RUNTIME_ENVIRONMENTS,
  PUBLISHED_RUNTIME_ENVIRONMENTS,
} from "@/utils/runtime-config";

const RUNTIME_ENVIRONMENTS = [
  ...DISPOSABLE_RUNTIME_ENVIRONMENTS,
  ...PUBLISHED_RUNTIME_ENVIRONMENTS,
] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(RUNTIME_ENVIRONMENTS).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  BASE: z.url().optional(),
  WEB_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  TRUST_PROXY: z.string().optional(),
  JWT_SECRET_KEY: z.string().min(32),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  BASE: parsedEnv.BASE ?? `http://localhost:${parsedEnv.PORT}`,
};
