"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { usePrivacyStatus } from "@/api/callers/privacy";
import { capturePrivacyBrowser } from "@/api/req/privacy";
import { touchAccountAttribution } from "@/api/req/privacy/attribution";
import { APPROVED_BROWSER_CAMPAIGNS, browserAttribution } from "./attribution-client";
import { CAMPAIGN_ATTRIBUTION_ENABLED, permittedBrowserCampaigns } from "./campaign-attribution";
import { usePrivacyChoice } from "./use-choice";
import { usePrivacyIdentity } from "./use-identity";

function Capture() {
  const { user, hasToken } = usePrivacyIdentity();
  const choice = usePrivacyChoice(user?.id);
  const path = usePathname();
  const searchParams = useSearchParams();
  const status = usePrivacyStatus(user?.id ?? "", Boolean(user?.id));
  useEffect(() => {
    if (!path || !searchParams) return;
    const capture = async () => {
      if (hasToken && !user?.id) return;
      // Do not inspect URLs or produce an identity before consent.
      const valid = choice?.campaigns && !choice.pendingRevocation && choice.expiresAt > Date.now();
      if (!valid) {
        if (choice && !choice.campaigns) await browserAttribution.revoke();
        return;
      }
      if (
        user?.id &&
        user.role === "psicologo" &&
        status.data?.granted &&
        status.data.document_version &&
        !status.isError
      )
        await capturePrivacyBrowser(status.data.revision, status.data.document_version).catch(
          () => {},
        );
      const campaigns = permittedBrowserCampaigns(
        window.location.search,
        APPROVED_BROWSER_CAMPAIGNS,
      );
      if (!user?.id) await browserAttribution.capture(choice, campaigns);
      else if (status.data?.granted && !status.isError && Object.keys(campaigns).length)
        await touchAccountAttribution(status.data.revision, campaigns).catch(() => {});
    };
    const run = () => {
      const result = navigator.locks
        ? navigator.locks.request("lectum-campaign-attribution", capture)
        : capture();
      void result.catch(() => {});
    };
    run();
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
    };
  }, [choice, path, searchParams, hasToken, user?.id, user?.role, status.data, status.isError]);
  return null;
}
export function AttributionCapture() {
  return CAMPAIGN_ATTRIBUTION_ENABLED ? (
    <Suspense fallback={null}>
      <Capture />
    </Suspense>
  ) : null;
}
