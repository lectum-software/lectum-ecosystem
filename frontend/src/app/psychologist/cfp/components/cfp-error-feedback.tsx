"use client";

import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  cfpErrorTitle,
  type ResolvedApiError,
  shouldShowCfpSupportGuidance,
  supportLinkProps,
} from "../modules/support";

export const CfpErrorFeedback = ({
  error,
  className,
}: {
  error: ResolvedApiError | null;
  className?: string;
}) =>
  error ? (
    <InlineAlert className={className} title={cfpErrorTitle} variant="error">
      <div className="grid gap-3">
        <p>{error.message}</p>
        {shouldShowCfpSupportGuidance(error) ? (
          <div className="grid gap-3">
            <Button asChild className="h-11 w-full rounded-full" variant="outline">
              <a {...supportLinkProps}>Fale com o suporte pelo WhatsApp</a>
            </Button>
          </div>
        ) : null}
      </div>
    </InlineAlert>
  ) : null;
