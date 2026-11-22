import type { Request, Response } from "express";
import { send } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import { browserCookieName } from "@/modules/marketing/browser-cookie";
import {
  CHECKOUT_CONTEXT_POLICY,
  captureCheckoutContext,
} from "@/modules/marketing/checkout-context";
import { captureCheckoutEntry } from "@/modules/marketing/checkout-entry";
import type { ConsentDTO } from "../DTOs";

export async function captureCheckout(req: Request, res: Response) {
  let captured = false;
  if (CHECKOUT_CONTEXT_POLICY.enabled) {
    try {
      captured = await captureCheckoutContext(
        (req as unknown as ConsentDTO).auth.id,
        req.cookies?.[browserCookieName],
        req.get("user-agent"),
        req.body,
      );
    } catch {
      // Optional evidence must never affect payment or expose request details.
    }
  }
  return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { captured } });
}

export async function captureEntry(req: Request, res: Response) {
  let captured = false;
  try {
    captured = await captureCheckoutEntry(
      (req as unknown as ConsentDTO).auth.id,
      req.cookies?.[browserCookieName],
      req.get("user-agent"),
      req.body,
    );
  } catch {
    // Optional measurement never interrupts checkout.
  }
  return send(res, { status: 200, ...msg("marketing_consent_saved"), data: { captured } });
}
