import type { Response } from "express";
import { sanitizeSensitiveData } from "@/utils/sanitize-sensitive";
import entities from "./entities";

export type Resolve = {
  status?: number;
  success: boolean;
  data?: unknown;
  message?: string;
  errors?: unknown;
  error?: string;
  code?: unknown;
  entity?: keyof typeof entities;
  type?: number | string;
};

export const send = (res: Response, resolve: Resolve) => {
  const sanitizedResolve = {
    ...resolve,
    data: sanitizeSensitiveData(resolve.data),
  };

  if (sanitizedResolve.success) {
    return res.status(sanitizedResolve.status || 200).send(sanitizedResolve);
  } else {
    if (!sanitizedResolve.success && !sanitizedResolve.entity) sanitizedResolve.entity = "s";

    let currentEntity: string | undefined;
    if (sanitizedResolve.entity) {
      currentEntity = entities?.[sanitizedResolve.entity];
    }

    const objectError: Omit<Resolve, "entity"> & { entity?: string } = {
      status: sanitizedResolve.status,
      success: sanitizedResolve.success,
    };

    if (sanitizedResolve.message) objectError.message = sanitizedResolve.message;
    if (sanitizedResolve.error) objectError.error = sanitizedResolve.error;
    if (sanitizedResolve.errors)
      objectError.errors = sanitizeSensitiveData(sanitizedResolve.errors);
    objectError.code = sanitizedResolve.code || "Unknown";
    if (sanitizedResolve.data) objectError.data = sanitizedResolve.data;
    if (currentEntity) objectError.entity = currentEntity;
    if (sanitizedResolve.type) objectError.type = sanitizedResolve.type;

    return res.status(sanitizedResolve.status || 400).send(objectError);
  }
};

export const error500 = (res: Response, type: number | string, err: unknown) => {
  const message = err instanceof Error ? err.message : "Message not found";

  console.error(`[INTERNAL ERROR TYPE ${type}]:${message}`);

  return send(res, {
    status: 500,
    success: false,
    error: "Internal Server Error",
    type,
  });
};
