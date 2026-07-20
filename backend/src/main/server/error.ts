import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { send } from "@/helpers/return";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Invalid request data",
      issues: error.issues,
    });
  }

  const status = Number(error.status || 500);
  const message = error instanceof Error ? error.message : "Internal Server Error";

  console.error("[SERVER] erro não tratado", {
    message,
    name: error?.name,
    status,
  });

  console.error(`[ERROR_HANDLER] ${status}: ${message}`);

  return res.status(status).json({
    success: false,
    error: status >= 500 ? "Internal Server Error" : message,
  });
};

export const errorRoute = (req: Request, res: Response) => {
  const method = req.method?.toUpperCase();

  return send(res, {
    success: false,
    error: `[${method}] - ${req.path} não encontrada.`,
    status: 404,
    entity: "d",
  });
};
