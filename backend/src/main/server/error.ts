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

  console.error(error);

  return res.status(error.status || 500).json({
    success: false,
    error: error.message || "Internal Server Error",
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
