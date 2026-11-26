"use client";
import { googleActionScope, trackGoogleEvent } from "./google-runtime";

// One attempt per mounted checkout visit, including Strict Mode effect replay.
// A later consent grant must not retroactively measure an earlier entry.
export function createGoogleCheckoutEntry() {
  const scope = googleActionScope();
  let attempted = false;
  return async (eligible: boolean) => {
    if (!eligible || attempted || !scope) return false;
    attempted = true;
    return trackGoogleEvent("begin_checkout", scope);
  };
}
