"use client";
import { attributionTransport } from "@/api/req/privacy/attribution";
import { getBrowserStorage, readStorageItem, removeStorageItem } from "@/utils/browser-storage";
import {
  BrowserAttribution,
  CAMPAIGN_ATTRIBUTION_ENABLED,
  type Campaigns,
} from "./campaign-attribution";
import { PRIVACY_NOTICE_VERSION, parsePrivacyChoice, privacyStorageKey } from "./policy";

// Both this catalog and server eligibility require review before any activation.
export const APPROVED_BROWSER_CAMPAIGNS: Partial<Record<keyof Campaigns, readonly string[]>> = {};
export const browserAttribution = new BrowserAttribution({
  enabled: CAMPAIGN_ATTRIBUTION_ENABLED,
  version: PRIVACY_NOTICE_VERSION,
  storage: () => getBrowserStorage("localStorage"),
  transport: attributionTransport,
  now: Date.now,
  currentChoice: () =>
    parsePrivacyChoice(readStorageItem(getBrowserStorage("localStorage"), privacyStorageKey(null))),
  newToken: () =>
    [...crypto.getRandomValues(new Uint8Array(32))]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join(""),
});
export function guestTransferToken() {
  if (!CAMPAIGN_ATTRIBUTION_ENABLED) return null;
  const choice = parsePrivacyChoice(
    readStorageItem(getBrowserStorage("localStorage"), privacyStorageKey(null)),
  );
  return browserAttribution.tokenForTransfer(choice);
}
export function clearGuestAcquisition() {
  if (!CAMPAIGN_ATTRIBUTION_ENABLED) return;
  browserAttribution.markTransferred();
  removeStorageItem(getBrowserStorage("localStorage"), privacyStorageKey(null));
}

export function authorizedGuestTransferToken() {
  const choice = parsePrivacyChoice(
    readStorageItem(getBrowserStorage("localStorage"), privacyStorageKey(null)),
  );
  return choice?.authorizeTransfer === true && !choice.pendingRevocation
    ? guestTransferToken()
    : null;
}
