import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { MarketingConsentError } from "@/modules/marketing/consent-policy";
import type { ConsentDTO } from "../DTOs";
import { clearBrowserCookie } from "./browser";
import * as services from "./services";

function action(name: "status" | "grant" | "revoke" | "touch") {
  const service = {
    status: services.status,
    grant: services.grant,
    revoke: services.revoke,
    touch: services.touch,
  }[name];
  return async (req: Request, res: Response) => {
    try {
      const data = await service(req as unknown as ConsentDTO);
      if (name === "revoke") clearBrowserCookie(res);
      return send(res, {
        status: 200,
        ...msg("marketing_consent_saved"),
        data,
      });
    } catch (err) {
      if (err instanceof MarketingConsentError)
        return send(res, { status: err.status, ...error(err.code) });
      return error500(res, `marketing_consent_${name}`, err);
    }
  };
}
export const status = action("status");
export const grant = action("grant");
export const revoke = action("revoke");
export const touch = action("touch");
