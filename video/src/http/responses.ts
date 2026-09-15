import type { Response } from "express";

export const sendSuccess = <T>(response: Response, status: number, data: T) =>
  response.status(status).json({ data, status, success: true });

export const sendPublicError = (
  response: Response,
  status: number,
  code: string,
  message: string,
) => response.status(status).json({ code, error: message, status, success: false });

export const disableCaching = (response: Response) => {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
};
