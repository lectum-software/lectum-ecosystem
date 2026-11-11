"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStripeBillingOperations } from "@/api/callers/psychologist-billing/stripe";
import type {
  StripeBillingKind,
  StripeBillingOperationResponse,
  StripeBillingOperationSummary,
  StripeBillingQuote,
} from "@/api/generator/types/stripe-billing";
import { isAdminViewAsReadOnlyError } from "@/utils/admin-view-as";
import {
  getBillingMutationErrorMessage,
  getBillingPublicErrorMessage,
} from "@/utils/billing-error";
import {
  canRetryStripeBillingOperation,
  stripeBillingConfirmationKind,
  stripeBillingOperationErrorCode,
} from "@/utils/stripe-billing";

export const useStripeOperation = ({
  kind,
  initialOperation,
  quote,
  onComplete,
}: {
  kind: StripeBillingKind;
  initialOperation?: StripeBillingOperationSummary | null;
  quote?: StripeBillingQuote;
  onComplete: () => Promise<boolean>;
}) => {
  const requests = useStripeBillingOperations();
  const requestsRef = useRef(requests);
  const completionRef = useRef(onComplete);
  const requestKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const [operation, setOperation] = useState<StripeBillingOperationSummary | null>(
    initialOperation ?? null,
  );
  const operationRef = useRef(operation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    requestsRef.current = requests;
    completionRef.current = onComplete;
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const accept = useCallback(
    async (result: StripeBillingOperationResponse) => {
      if (!mountedRef.current) return;
      const { id, kind: resultKind, state } = result.operation;
      if (resultKind !== kind) throw new Error("Invalid billing operation");
      const summary = {
        id,
        kind: resultKind,
        state,
        confirmation_kind: stripeBillingConfirmationKind(result.operation.confirmation_kind),
        error_code: stripeBillingOperationErrorCode(result.operation.error_code),
        payment_pending: result.operation.payment_pending === true,
      };
      operationRef.current = summary;
      setOperation(summary);
      setError(getBillingPublicErrorMessage(summary.error_code) ?? "");
      if (state === "complete") {
        const completed = await completionRef.current();
        if (!completed && mountedRef.current) {
          const pending = { ...summary, state: "processing" as const };
          operationRef.current = pending;
          setOperation(pending);
        }
      }
    },
    [kind],
  );

  const verify = useCallback(
    async (authorizePayment = false) => {
      const current = operationRef.current;
      if (!current || inFlightRef.current) return null;
      inFlightRef.current = true;
      setBusy(true);
      setError("");
      const mutation = requestsRef.current.confirm;
      try {
        const result = await mutation.mutateAsync({ kind, id: current.id, authorizePayment });
        await accept(result);
        return result;
      } catch (failure) {
        if (mountedRef.current && !isAdminViewAsReadOnlyError(failure)) {
          setError(
            getBillingMutationErrorMessage(
              failure,
              kind === "checkout" ? "checkout" : "payment-method",
            ),
          );
        }
        return null;
      } finally {
        mutation.reset();
        inFlightRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    },
    [accept, kind],
  );

  const begin = useCallback(async () => {
    if (operationRef.current) return verify(true);
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setBusy(true);
    setError("");
    const api = requestsRef.current;
    try {
      requestKeyRef.current ??= crypto.randomUUID();
      const result =
        kind === "checkout" && quote
          ? await api.checkout.mutateAsync({
              request_key: requestKeyRef.current,
              quote_revision: quote.revision,
              ...(quote.intent === "courtesy_renewal"
                ? { intent: "courtesy_renewal" as const }
                : {}),
            })
          : kind === "payment_method"
            ? await api.paymentMethod.mutateAsync({ request_key: requestKeyRef.current })
            : null;
      if (result) await accept(result);
      return result;
    } catch (failure) {
      // Keep the same request key after an ambiguous result. Never start another charge.
      if (mountedRef.current && !isAdminViewAsReadOnlyError(failure)) {
        setError(
          getBillingMutationErrorMessage(
            failure,
            kind === "checkout" ? "checkout" : "payment-method",
          ),
        );
      }
      return null;
    } finally {
      api.checkout.reset();
      api.paymentMethod.reset();
      inFlightRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [accept, kind, quote, verify]);

  const initialId = initialOperation?.id;
  const retryFailed = useCallback(() => {
    // Only a definitive server-side terminal failure allows a new operation/key.
    if (inFlightRef.current || !canRetryStripeBillingOperation(operationRef.current?.state))
      return false;
    operationRef.current = null;
    requestKeyRef.current = null;
    pollCountRef.current = 0;
    setOperation(null);
    setError("");
    return true;
  }, []);
  useEffect(() => {
    if (!initialId || initialOperation?.kind !== kind) return;
    operationRef.current = initialOperation;
    void verify();
  }, [initialId, initialOperation, kind, verify]);

  useEffect(() => {
    if (operation?.state !== "processing" || error || busy || pollCountRef.current >= 20) return;
    const timer = setTimeout(() => {
      pollCountRef.current += 1;
      void verify();
    }, 3000);
    return () => clearTimeout(timer);
  }, [busy, error, operation, verify]);

  return { operation, busy, error, begin, verify, retryFailed };
};
