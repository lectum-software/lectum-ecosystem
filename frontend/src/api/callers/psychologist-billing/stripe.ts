"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { StripeBillingKind } from "@/api/generator/types/stripe-billing";
import {
  confirmStripeBillingOperation,
  createStripeBillingCheckout,
  createStripeBillingPaymentMethod,
  getStripeBillingConfig,
} from "@/api/req/psychologist-billing/stripe";

export const useStripeBillingConfig = (courtesyRenewal = false) =>
  useQuery({
    queryKey: keys.psychologistBilling.stripeConfig(courtesyRenewal),
    queryFn: () => getStripeBillingConfig(courtesyRenewal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useStripeBillingOperations = () => {
  // Confirmation secrets are transient mutation results, never query data or storage.
  // Callers reset each mutation after consuming its result.
  const checkout = useMutation({
    mutationFn: createStripeBillingCheckout,
    retry: false,
    gcTime: 0,
  });
  const paymentMethod = useMutation({
    mutationFn: createStripeBillingPaymentMethod,
    retry: false,
    gcTime: 0,
  });
  const confirm = useMutation({
    mutationFn: ({
      kind,
      id,
      authorizePayment = false,
    }: {
      kind: StripeBillingKind;
      id: string;
      authorizePayment?: boolean;
    }) => confirmStripeBillingOperation(kind, id, authorizePayment),
    retry: false,
    gcTime: 0,
  });
  return { checkout, paymentMethod, confirm };
};
