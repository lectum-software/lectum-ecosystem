import type { Response } from "express";
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
  if (resolve.success) {
    return res.status(resolve.status || 200).send(resolve);
  } else {
    if (!resolve.success && !resolve.entity) resolve.entity = "s";

    let currentEntity: string | undefined;
    if (resolve.entity) {
      currentEntity = entities?.[resolve.entity];
    }

    const objectError: Omit<Resolve, "entity"> & { entity?: string } = {
      status: resolve.status,
      success: resolve.success,
    };

    if (resolve.message) objectError.message = resolve.message;
    if (resolve.error) objectError.error = resolve.error;
    if (resolve.errors) objectError.errors = resolve.errors;
    objectError.code = resolve.code || "Unknown";
    if (resolve.data) objectError.data = resolve.data;
    if (currentEntity) objectError.entity = currentEntity;
    if (resolve.type) objectError.type = resolve.type;

    return res.status(resolve.status || 400).send(objectError);
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
