import { createId } from "@paralleldrive/cuid2";
import type { NextFunction, Request, Response } from "express";

export const attachRequestTrace = (request: Request, response: Response, next: NextFunction) => {
  const traceId = createId();
  request.videoTraceId = traceId;
  response.setHeader("X-Trace-Id", traceId);
  next();
};
