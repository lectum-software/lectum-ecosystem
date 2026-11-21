import type { Request, Response } from "express";
import { z } from "zod";
import { send } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import {
  browserCookieName,
  clearBrowserCookie,
  browserCookieOptions as options,
} from "@/modules/marketing/browser-cookie";

export { clearBrowserCookie } from "@/modules/marketing/browser-cookie";

import {
  BROWSER_IDENTIFIER_POLICY,
  captureBrowserIdentifier,
} from "@/modules/marketing/browser-identifier-repository";
import { MARKETING_CONSENT_POLICY } from "@/modules/marketing/consent-policy";
import type { ConsentDTO } from "../DTOs";

export async function captureBrowser(req: Request, res: Response) {
  if (!BROWSER_IDENTIFIER_POLICY.enabled)
    return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { enabled: false } });
  try {
    const input = z
      .object({
        expected_revision: z.number().int().positive(),
        document_version: z.literal(MARKETING_CONSENT_POLICY.documentVersion!),
      })
      .strict()
      .parse(req.body);
    const result = await captureBrowserIdentifier(
      (req as unknown as ConsentDTO).auth.id,
      input.expected_revision,
      input.document_version,
      req.cookies?.[browserCookieName],
    );
    if ("clear" in result) clearBrowserCookie(res);
    else if ("token" in result)
      res.cookie(browserCookieName, result.token, { ...options, expires: result.expiresAt });
    return send(res, {
      status: 200,
      ...msg("marketing_consent_saved"),
      data: { enabled: result.enabled },
    });
  } catch {
    // Never log cookies, identifiers or request details; optional measurement cannot break actions.
    return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { enabled: false } });
  }
}
