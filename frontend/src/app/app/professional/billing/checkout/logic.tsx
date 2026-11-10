"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useStripeBillingConfig } from "@/api/callers/psychologist-billing/stripe";
import { isStripePublishableKey } from "@/utils/stripe-billing";
import { BillingProviderState } from "../components/provider-state";

const MercadoPagoCheckout = dynamic(
  () => import("./mercado-pago-logic").then((module) => module.MercadoPagoCheckoutLogic),
  { ssr: false, loading: () => <BillingProviderState loading /> },
);
const StripeCheckout = dynamic(
  () => import("./stripe-logic").then((module) => module.StripeCheckoutLogic),
  { ssr: false, loading: () => <BillingProviderState loading /> },
);

export const ProfessionalBillingCheckoutLogic = () => {
  const search = useSearchParams();
  const config = useStripeBillingConfig(search.get("intent") === "courtesy-renewal");
  if (config.isPending) return <BillingProviderState loading />;
  if (config.data?.checkout_provider === "mercadopago") return <MercadoPagoCheckout />;
  if (
    config.data?.checkout_provider === "stripe" &&
    config.data.enabled &&
    isStripePublishableKey(config.data.publishable_key)
  ) {
    return <StripeCheckout config={config.data} />;
  }
  return (
    <BillingProviderState
      retry={() => {
        void config.refetch();
      }}
    />
  );
};
