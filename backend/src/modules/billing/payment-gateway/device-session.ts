import { z } from "zod";

const isDeviceSessionId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 256 &&
  !/[^A-Za-z0-9_-]/.test(value);

// No coercion or trimming: this value becomes an outbound HTTP header.
export const deviceSessionIdSchema = z.string().refine(isDeviceSessionId, "Dados inválidos.");

export const normalizeDeviceSessionId = (value: unknown): string | undefined =>
  isDeviceSessionId(value) ? value : undefined;
