import type { ErrorRequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { send } from "@/helpers/return";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const publicErrorMessage = (status: number) => {
  if (status === 400) return "Os dados enviados são inválidos.";
  if (status === 401) return "Sua sessão não está autorizada.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "O recurso solicitado não foi encontrado.";
  if (status === 409) return "Não foi possível concluir por conflito de dados.";
  if (status === 413) return "O conteúdo enviado excede o limite permitido.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";

  return "Não foi possível concluir a solicitação agora.";
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: publicErrorMessage(400),
    });
  }

  const rawStatus = Number(error.status || 500);
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  console.error("[SERVER] erro não tratado", {
    ...toSafeErrorLog(error),
    method: req.method,
    path: req.path,
    status,
  });

  return res.status(status).json({
    success: false,
    error: publicErrorMessage(status),
  });
};

export const errorRoute = (_req: Request, res: Response) => {
  return send(res, {
    success: false,
    error: publicErrorMessage(404),
    status: 404,
  });
};
