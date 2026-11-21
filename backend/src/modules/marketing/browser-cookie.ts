import type { Response } from "express";

export const browserCookieName = "lectum_measurement_browser";
export const browserCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: true,
  path: "/api/private/marketing/consent",
};
export function clearBrowserCookie(res: Response) {
  res.clearCookie(browserCookieName, browserCookieOptions);
}
