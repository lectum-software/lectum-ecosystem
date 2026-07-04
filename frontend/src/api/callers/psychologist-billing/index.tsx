"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  BillingAddressPayload,
  BillingAddressResponse,
  BillingCancelSubscriptionResponse,
  BillingCheckoutPayload,
  BillingCheckoutResponse,
  BillingPaymentMethodPayload,
  BillingPaymentMethodResponse,
  BillingSelectFreeResponse,
  BillingSyncResponse,
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
    sync?: {
      onSuccess?: (data: BillingSyncResponse) => void;
      onError?: (error: unknown) => void;
    };
    cancelSubscription?: {
      onSuccess?: (data: BillingCancelSubscriptionResponse) => void;
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

  const sync = useMutation({
    mutationFn: () => api.syncPsychologistBillingSubscription(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      callbacks?.sync?.onSuccess?.(data);
    },
    onError: callbacks?.sync?.onError,
  });

  const cancelSubscription = useMutation({
    mutationFn: () => api.cancelPsychologistBillingSubscription(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "directory_psychologist",
      });
      queryClient.invalidateQueries({ queryKey: keys.psychologistAnalytics.root() });
      callbacks?.cancelSubscription?.onSuccess?.(data);
    },
    onError: callbacks?.cancelSubscription?.onError,
  });

  const address = useMutation({
    mutationFn: (body: BillingAddressPayload) => api.savePsychologistBillingAddress(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.current() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistBilling.subscription() });
      queryClient.invalidateQueries({ queryKey: keys.psychologistFreeProfile.root() });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "auth_hydrate" });
      queryClient.invalidateQueries({ queryKey: keys.directory.psychologistsRoot() });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "directory_psychologist",
      });
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
    sync,
    cancelSubscription,
    address,
    paymentMethod,
  };
};
