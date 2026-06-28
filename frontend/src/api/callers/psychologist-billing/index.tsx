"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  BillingAddressPayload,
  BillingAddressResponse,
  BillingCheckoutPayload,
  BillingCheckoutResponse,
  BillingPaymentMethodPayload,
  BillingPaymentMethodResponse,
  BillingSelectFreeResponse,
} from "@/api/generator/types/billing";
import * as api from "@/api/req/psychologist-billing";

export interface UsePsychologistBillingProps {
  callbacks?: {
    selectFree?: {
      onSuccess?: (data: BillingSelectFreeResponse) => void;
      onError?: (error: unknown) => void;
    };
    checkout?: {
      onSuccess?: (data: BillingCheckoutResponse) => void;
      onError?: (error: unknown) => void;
    };
    address?: {
      onSuccess?: (data: BillingAddressResponse) => void;
      onError?: (error: unknown) => void;
    };
    paymentMethod?: {
      onSuccess?: (data: BillingPaymentMethodResponse) => void;
      onError?: (error: unknown) => void;
    };
  };
}

export const usePsychologistBilling = ({ callbacks }: UsePsychologistBillingProps = {}) => {
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: keys.psychologistBilling.plans(),
    queryFn: () => api.getPsychologistBillingPlans(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const current = useQuery({
    queryKey: keys.psychologistBilling.current(),
    queryFn: () => api.getPsychologistBillingCurrent(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const subscription = useQuery({
    queryKey: keys.psychologistBilling.subscription(),
    queryFn: () => api.getPsychologistBillingSubscription(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const selectFree = useMutation({
    mutationFn: () => api.selectPsychologistBillingFreePlan(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      callbacks?.selectFree?.onSuccess?.(data);
    },
    onError: callbacks?.selectFree?.onError,
  });

  const checkout = useMutation({
    mutationFn: (body: BillingCheckoutPayload) => api.createPsychologistBillingCheckout(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      callbacks?.checkout?.onSuccess?.(data);
    },
    onError: callbacks?.checkout?.onError,
  });

  const address = useMutation({
    mutationFn: (body: BillingAddressPayload) => api.savePsychologistBillingAddress(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      callbacks?.address?.onSuccess?.(data);
    },
    onError: callbacks?.address?.onError,
  });

  const paymentMethod = useMutation({
    mutationFn: (body: BillingPaymentMethodPayload) =>
      api.updatePsychologistBillingPaymentMethod(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      callbacks?.paymentMethod?.onSuccess?.(data);
    },
    onError: callbacks?.paymentMethod?.onError,
  });

  return {
    plans,
    current,
    subscription,
    selectFree,
    checkout,
    address,
    paymentMethod,
  };
};
