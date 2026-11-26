"use client";
import { useEffect } from "react";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { pendingGoogleCheckout, sendGoogleSubscription } from "./google-billing";
import { googleConsentScope } from "./google-choice";
import { GOOGLE_CHOICE_CHANGED } from "./google-policy";
import {
  GOOGLE_ENABLED,
  stopGoogleMeasurement,
  syncGoogleMeasurement,
  trackGoogleEvent,
} from "./google-runtime";
export function GoogleAnalytics() {
  useEffect(() => {
    if (!GOOGLE_ENABLED) return;
    const sync = () => {
      const scope = googleConsentScope();
      if (!scope) stopGoogleMeasurement();
      else
        void syncGoogleMeasurement(scope)
          .then((ready) => {
            if (ready) void trackGoogleEvent("page_view", scope, "document");
          })
          .catch(() => stopGoogleMeasurement());
    };
    let checking = false;
    let attempts = 0;
    const checkPayment = async () => {
      const pending = pendingGoogleCheckout();
      if (!pending || checking || attempts >= 20) return;
      attempts++;
      checking = true;
      try {
        const proof = await handleReq<{ event_id: string; paid_at: string } | null>({
          ...callEndpoint({
            route: "/api/private/psychologist/billing/stripe/checkout/:id/measurement",
            params: { id: pending.id },
          }),
          hideError: true,
          signOutOnUnauthorized: false,
        });
        if (proof) await sendGoogleSubscription(proof, pending);
      } catch {
        /* Old backends and offline payment confirmation remain non-blocking. */
      } finally {
        checking = false;
      }
    };
    const paymentTimer = window.setInterval(() => void checkPayment(), 15_000);
    sync();
    window.addEventListener(GOOGLE_CHOICE_CHANGED, sync);
    window.addEventListener("storage", sync);
    const timer = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener(GOOGLE_CHOICE_CHANGED, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(timer);
      window.clearInterval(paymentTimer);
      stopGoogleMeasurement();
    };
  }, []);
  return null;
}
