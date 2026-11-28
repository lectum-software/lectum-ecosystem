"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { guestMeasurementToken } from "@/components/privacy/attribution-client";
import { useMeasurementScope } from "@/components/privacy/measurement-boundary";
import { PRIVACY_CHANGED } from "@/components/privacy/policy";
import { localCampaignConsentScope } from "@/components/privacy/use-choice";
import { usePrivacyIdentity } from "@/components/privacy/use-identity";
import {
  META_PIXEL_ENABLED,
  pixelConsentStart,
  readPixelChoice,
  usePixelChoice,
} from "./meta-pixel-choice";
import { pixelLocationAllowed } from "./meta-pixel-events";
import { revokeProductionPixel, sendPixelReceipt } from "./meta-pixel-runtime";

const responseSchema = z.object({
  pixelId: z
    .string()
    .regex(/^\d{5,25}$/)
    .optional(),
  events: z
    .array(
      z.object({
        eventId: z.string().regex(/^[a-f0-9]{64}$/),
        occurredAt: z.number().int().positive(),
        eventName: z.enum([
          "CompleteRegistration",
          "Contact",
          "forum_post",
          "InitiateCheckout",
          "Subscribe",
        ]),
        params: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
    )
    .max(30),
});

export function MetaPixel() {
  const scope = useMeasurementScope();
  const pixelChoice = usePixelChoice();
  const { user } = usePrivacyIdentity();
  const userId = user?.id || null;
  const pathname = usePathname();
  useEffect(() => {
    if (!META_PIXEL_ENABLED || !scope || pixelChoice !== "granted") return;
    let stopped = false;
    let busy = false;
    const controller = new AbortController();
    const authorized = () =>
      !stopped &&
      !document.hidden &&
      localCampaignConsentScope(userId) === scope &&
      readPixelChoice() === "granted" &&
      location.pathname === pathname &&
      pixelLocationAllowed(location.href);
    const revoke = () => {
      if (!authorized()) revokeProductionPixel();
    };
    const stop = () => {
      stopped = true;
      controller.abort();
      revokeProductionPixel();
    };
    const poll = async () => {
      if (busy || document.hidden || !authorized()) {
        revoke();
        return;
      }
      const token = userId ? null : guestMeasurementToken();
      if (!userId && !token) return;
      busy = true;
      try {
        const response = responseSchema.parse(
          await handleReq<unknown>({
            ...callEndpoint({
              route: userId
                ? "/api/private/marketing/consent/pixel-events"
                : "/api/public/marketing/attribution/pixel-events",
              method: "POST",
              body: userId ? {} : { token },
            }),
            config: { signal: controller.signal },
            hideError: true,
            signOutOnUnauthorized: false,
          }),
        );
        if (response.pixelId && authorized()) {
          for (const receipt of response.events) {
            const start = pixelConsentStart();
            if (start !== null && receipt.occurredAt >= start)
              await sendPixelReceipt(response.pixelId, receipt, authorized);
          }
        }
      } catch {
        /* Measurement is optional, including during mixed-version deployments. */
      } finally {
        busy = false;
      }
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 5000);
    window.addEventListener(PRIVACY_CHANGED, revoke);
    window.addEventListener("storage", revoke);
    window.addEventListener("pagehide", revokeProductionPixel);
    return () => {
      stop();
      clearInterval(timer);
      window.removeEventListener(PRIVACY_CHANGED, revoke);
      window.removeEventListener("storage", revoke);
      window.removeEventListener("pagehide", revokeProductionPixel);
    };
  }, [scope, userId, pathname, pixelChoice]);
  return null;
}
