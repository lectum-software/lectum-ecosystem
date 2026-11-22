import { getToken } from "@/hooks/cookies/token";
import { store } from "@/store";
import { localCampaignConsentScope } from "./use-choice";

export function hasInternalMeasurementConsent(expectedScope?: string | null) {
  const authenticated = Boolean(getToken());
  const userId = authenticated ? store.getState().user?.id || null : null;
  if (authenticated && !userId) return false;
  const scope = localCampaignConsentScope(userId);
  return scope !== null && (expectedScope === undefined || scope === expectedScope);
}
