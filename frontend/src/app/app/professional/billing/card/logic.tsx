"use client";

import dynamic from "next/dynamic";
import { useStripeBillingConfig } from "@/api/callers/psychologist-billing/stripe";
import { isStripePublishableKey } from "@/utils/stripe-billing";
import { BillingProviderState } from "../components/provider-state";

const MercadoPagoCard = dynamic(
  () => import("./mercado-pago-logic").then((module) => module.MercadoPagoCardLogic),
  { ssr: false, loading: () => <BillingProviderState loading /> },
);
const StripeCard = dynamic(
  () => import("./stripe-logic").then((module) => module.StripeCardLogic),
  { ssr: false, loading: () => <BillingProviderState loading /> },
);

export const ProfessionalBillingCardLogic = () => {
  const config = useStripeBillingConfig();
  if (config.isPending) return <BillingProviderState loading />;
  if (config.data?.payment_method_provider === "mercadopago") return <MercadoPagoCard />;
  if (
    config.data?.payment_method_provider === "stripe" &&
    isStripePublishableKey(config.data.publishable_key)
  ) {
    return <StripeCard config={config.data} />;
  }
  return (
    <BillingProviderState
      retry={() => {
        void config.refetch();
      }}
    />
  );
};
