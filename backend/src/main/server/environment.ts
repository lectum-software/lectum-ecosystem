import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "dev", "test", "production", "prod"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  BASE: z.url().default("http://localhost:3001"),
  WEB_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  TRUST_PROXY: z.string().optional(),
  JWT_SECRET_KEY: z.string().min(32),
});

export const env = envSchema.parse(process.env);
