import { getToken } from "@/hooks/cookies/token";
import { store } from "@/store";
import { hasLocalCampaignConsent } from "./use-choice";

export function hasInternalMeasurementConsent() {
  const authenticated = Boolean(getToken());
  const userId = authenticated ? store.getState().user?.id || null : null;
  if (authenticated && !userId) return false;
  return hasLocalCampaignConsent(userId);
}
