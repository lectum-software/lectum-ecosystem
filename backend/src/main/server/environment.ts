import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "dev", "test", "production", "prod"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3002),
  BASE: z.url().default("http://localhost:3002"),
  WEB_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
});

export const env = envSchema.parse(process.env);
