import type { Response } from "express";
import { sanitizePublicErrorData, sanitizePublicErrorMessage } from "@/utils/public-error";
import { sanitizePublicResponseData } from "@/utils/public-response";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { sanitizeSensitiveData } from "@/utils/sanitize-sensitive";
import { applyUserAuthCookie } from "@/utils/user-auth-cookie";

export type Resolve = {
  allowAuthTokens?: boolean;
  status?: number;
  success: boolean;
  data?: unknown;
  message?: string;
  errors?: unknown;
  error?: string;
  code?: unknown;
  entity?: "c" | "d" | "s";
  type?: number | string;
};

export const send = (res: Response, resolve: Resolve) => {
  const cookieAwareResolve = applyUserAuthCookie(res.req, res, resolve);
  const {
    allowAuthTokens = false,
    entity: _entity,
    type: _type,
    ...publicResolve
  } = cookieAwareResolve;
  const sanitizedResolve = {
    ...publicResolve,
    data: sanitizePublicResponseData(
      sanitizeSensitiveData(cookieAwareResolve.data, { removeAuthTokens: !allowAuthTokens }),
    ),
  };

  if (sanitizedResolve.success) {
    return res.status(sanitizedResolve.status || 200).send(sanitizedResolve);
  }

  const objectError: Resolve = {
    status: sanitizedResolve.status,
    success: false,
  };

  if (sanitizedResolve.message) {
    objectError.message = sanitizePublicErrorMessage(sanitizedResolve.message);
  }
  if (sanitizedResolve.error) {
    objectError.error = sanitizePublicErrorMessage(sanitizedResolve.error);
  }
  if (sanitizedResolve.errors)
    objectError.errors = sanitizePublicErrorData(
      sanitizeSensitiveData(sanitizedResolve.errors, {
        removeAuthTokens: true,
        removePii: true,
      }),
    );
  if (sanitizedResolve.code) objectError.code = sanitizedResolve.code;
  // `error()` usa `data` internamente para interpolar traduções. Esses parâmetros
  // (por exemplo nomes de modelos) não fazem parte do contrato público de falha.

  return res.status(sanitizedResolve.status || 400).send(objectError);
};

export const error500 = (res: Response, type: number | string, err: unknown) => {
  console.error("[INTERNAL ERROR] Falha ao processar a solicitação.", {
    ...toSafeErrorLog(err),
    type,
  });

  return send(res, {
    status: 500,
    success: false,
    error: "Não foi possível concluir a solicitação agora.",
    type,
  });
};
