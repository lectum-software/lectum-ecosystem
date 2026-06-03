import type { RequestHandler } from "express";

type LimiterOptions = {
  window?: number;
  max?: number;
};

export const getLimiter = (_options: LimiterOptions = {}): RequestHandler => {
  return (_req, _res, next) => next();
};
