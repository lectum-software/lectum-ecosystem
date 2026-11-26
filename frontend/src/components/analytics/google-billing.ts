"use client";
import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";
import { googleActionScope, trackGoogleEvent } from "./google-runtime";

const key = "lectum.google-checkout.v1";
type PendingCheckout = { scope: string; id: string; startedAt: number; expiresAt: number };
export function rememberGoogleCheckout(id: string, scope: string | null) {
  if (!scope || scope !== googleActionScope()) return;
  const startedAt = Date.now();
  writeStorageItem(
    getBrowserStorage("sessionStorage"),
    key,
    JSON.stringify({ id, scope, startedAt, expiresAt: startedAt + 24 * 60 * 60_000 }),
  );
}
export function pendingGoogleCheckout(): PendingCheckout | null {
  try {
    const pending = JSON.parse(readStorageItem(getBrowserStorage("sessionStorage"), key) || "null");
    return pending &&
      /^[A-Za-z0-9-]{16,64}$/.test(pending.id) &&
      pending.scope === googleActionScope() &&
      Number.isFinite(pending.startedAt) &&
      pending.startedAt <= Date.now() &&
      Number.isFinite(pending.expiresAt) &&
      pending.expiresAt > Date.now()
      ? pending
      : null;
  } catch {
    return null;
  }
}
export async function sendGoogleSubscription(
  proof: { event_id: string; paid_at: string },
  pending: PendingCheckout,
) {
  if (
    !Number.isFinite(Date.parse(proof.paid_at)) ||
    !proof.event_id ||
    pending.scope !== googleActionScope() ||
    pendingGoogleCheckout()?.id !== pending.id ||
    Date.parse(proof.paid_at) < pending.startedAt ||
    Date.parse(proof.paid_at) > Date.now()
  )
    return;
  if (!(await trackGoogleEvent("subscribe", pending.scope, proof.event_id))) return;
  // One attempt per verified receipt in this browser; no historical payment replay.
  removeStorageItem(getBrowserStorage("sessionStorage"), key);
}
