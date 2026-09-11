import { type Dispatch, type SetStateAction, useState } from "react";
import {
  type ConversionIntent,
  type ConversionPromptState,
  type ConversionTrigger,
  clearPendingIntent,
  hasPromptBeenShown,
  isActionPromptType,
  isConversionPromptSuppressedPath,
  markPromptAsShown,
  recordConversionAnalytics,
  savePendingIntent,
} from "./progressive-conversion-state";

export const useConversionPromptState = (isAuthenticated: boolean) => {
  const state = useState<ConversionPromptState | null>(null);
  // Discard a previous anonymous prompt before committing the authenticated UI.
  // Keeping it hidden only would resurrect the old offer after a later sign-out.
  if (isAuthenticated && state[0]) state[1](null);
  return state;
};

export const createConversionPromptOpener =
  (
    pathnameRef: { current: string },
    isAuthenticatedRef: { current: boolean },
    setPrompt: Dispatch<SetStateAction<ConversionPromptState | null>>,
  ) =>
  (trigger: ConversionTrigger, intent?: ConversionIntent) => {
    // Timer callbacks can outlive the anonymous render that queued them.
    if (isAuthenticatedRef.current) return false;
    if (isConversionPromptSuppressedPath(pathnameRef.current)) return false;

    recordConversionAnalytics(trigger, pathnameRef.current);

    const shouldBypassSessionLimit = isActionPromptType(intent?.type);

    if (hasPromptBeenShown() && !shouldBypassSessionLimit) return false;

    const shouldStorePendingIntent = intent?.type !== "vote_post" && intent?.type !== "vote_reply";

    if (shouldStorePendingIntent) {
      savePendingIntent(intent);
    } else {
      clearPendingIntent();
    }
    markPromptAsShown();
    setPrompt({
      intent,
      trigger,
    });

    return false;
  };
