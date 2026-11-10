"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { StripeBillingConfig, StripeBillingKind } from "@/api/generator/types/stripe-billing";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  buildStripeBillingReturnUrl,
  canRetryStripeBillingOperation,
  getStripeElementErrorMessage,
  isStripeBillingQuoteValid,
  isStripePublishableKey,
  readStripeBillingConfirmation,
} from "@/utils/stripe-billing";
import { useStripeOperation } from "./use-stripe-operation";

const stripeInstances = new Map<string, Promise<Stripe | null>>();
const stripeForKey = (key: string) => {
  const existing = stripeInstances.get(key);
  if (existing) return existing;
  const instance = loadStripe(key).catch(() => null);
  stripeInstances.set(key, instance);
  return instance;
};

type Props = {
  config: StripeBillingConfig;
  kind: StripeBillingKind;
  onComplete: () => Promise<boolean>;
};

const PaymentForm = ({ config, kind, onComplete }: Props) => {
  const stripe = useStripe();
  const elements = useElements();
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [elementError, setElementError] = useState("");
  const operation = useStripeOperation({
    kind,
    initialOperation: config.pending_operation?.kind === kind ? config.pending_operation : null,
    quote: config.quote,
    onComplete,
  });
  const state = operation.operation?.state;
  const canConfirm = !state || state === "requires_confirmation";
  const actionOnly = operation.operation?.confirmation_kind === "action";
  const retryable = canRetryStripeBillingOperation(state);
  const needsCardUpdate =
    operation.operation?.error_code === "billing_payment_method_update_required";
  const busy = submitting || operation.busy;
  const courtesy = kind === "checkout" && config.quote?.intent === "courtesy_renewal";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || (!actionOnly && !elements) || submitLock.current || busy || !canConfirm) return;
    submitLock.current = true;
    setSubmitting(true);
    setElementError("");
    try {
      if (!actionOnly && elements) {
        const validation = await elements.submit();
        if (validation.error) {
          setElementError(getStripeElementErrorMessage(validation.error));
          return;
        }
      }
      const result = await operation.begin();
      if (result?.operation.state !== "requires_confirmation") return;
      let confirmation = readStripeBillingConfirmation(result);
      if (!confirmation || (kind === "payment_method" && confirmation.type !== "setup")) {
        setElementError(getStripeElementErrorMessage(null));
        return;
      }
      if (confirmation.type === "setup") {
        if (!elements || actionOnly) {
          setElementError(getStripeElementErrorMessage(null));
          return;
        }
        const confirmed = await stripe.confirmSetup({
          elements,
          clientSecret: confirmation.client_secret,
          confirmParams: {
            return_url: buildStripeBillingReturnUrl(
              window.location.origin,
              kind,
              result.operation.id,
            ),
          },
          redirect: "if_required",
        });
        if (confirmed.error) {
          setElementError(getStripeElementErrorMessage(confirmed.error));
          return;
        }
        // The server validates the saved card before creating/confirming any payment.
        const verified = await operation.verify(true);
        if (verified?.operation.state !== "requires_confirmation") return;
        confirmation = readStripeBillingConfirmation(verified);
        if (kind === "payment_method" || confirmation?.type !== "action") return;
      }
      // Only bank authentication is performed here. Manual payment confirmation stays server-side.
      const authenticated = await stripe.handleNextAction({
        clientSecret: confirmation.client_secret,
      });
      if (authenticated.error) {
        setElementError(getStripeElementErrorMessage(authenticated.error));
        return;
      }
      await operation.verify(true);
    } catch {
      setElementError(getStripeElementErrorMessage(null));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={submit}
      data-lectum-pull-refresh-block={busy ? "true" : undefined}
    >
      {canConfirm ? (
        <>
          {actionOnly ? (
            <InlineAlert title="Confirme o pagamento">
              Continue para confirmar o pagamento pendente. Se o banco solicitar, você poderá
              autenticar o cartão nesta etapa. Isso não cria outra assinatura.
            </InlineAlert>
          ) : (
            <>
              {!ready ? (
                <LoadingState className="min-h-24" label="Carregando campos seguros do cartão" />
              ) : null}
              <PaymentElement
                options={{
                  layout: "tabs",
                  readOnly: busy,
                  wallets: { applePay: "never", googlePay: "never", link: "never" },
                }}
                onReady={() => setReady(true)}
                onLoadError={() =>
                  setElementError(
                    "Não foi possível carregar os campos seguros. Recarregue esta página antes de continuar.",
                  )
                }
              />
              <p className="text-sm leading-6 text-muted">
                {courtesy
                  ? "Ao cadastrar, você autoriza a cobrança mensal após o fim da cortesia, na data e no valor informados."
                  : kind === "checkout"
                    ? "Ao confirmar, você autoriza a assinatura mensal no valor informado. A renovação pode ser cancelada em Minha assinatura."
                    : "O cartão será usado nas próximas cobranças da sua assinatura. A troca não confirma o pagamento de uma pendência."}
              </p>
            </>
          )}
          {needsCardUpdate ? (
            <Button asChild className="h-12 w-full" variant="outline">
              <Link href="/app/profissional/assinatura/cartao">Atualizar cartão</Link>
            </Button>
          ) : null}
          <Button
            className="h-12 w-full"
            disabled={!stripe || (!actionOnly && (!elements || !ready)) || busy}
            type="submit"
          >
            {busy
              ? "Conferindo..."
              : actionOnly
                ? "Continuar pagamento"
                : kind === "payment_method" || courtesy
                  ? "Salvar cartão"
                  : "Confirmar assinatura"}
          </Button>
        </>
      ) : (
        <>
          <InlineAlert
            title={
              state === "failed" || state === "review_required"
                ? "Confira sua assinatura"
                : "Verificando confirmação"
            }
          >
            {retryable
              ? "Esta tentativa foi encerrada. Você pode informar outro cartão de crédito para continuar."
              : "A confirmação ainda precisa ser conferida. Verifique o status e se houve cobrança antes de tentar novamente."}
          </InlineAlert>
          <Button
            className="h-12 w-full"
            disabled={busy}
            onClick={() => {
              if (retryable) {
                if (operation.retryFailed()) {
                  setElementError("");
                  setReady(false);
                }
              } else {
                void operation.verify();
              }
            }}
            type="button"
            variant="outline"
          >
            {busy ? "Conferindo..." : retryable ? "Informar outro cartão" : "Verificar status"}
          </Button>
        </>
      )}
      <div className="min-h-6" aria-live="polite">
        {elementError || operation.error ? (
          <InlineAlert variant="error">{elementError || operation.error}</InlineAlert>
        ) : null}
      </div>
    </form>
  );
};

export const StripePaymentForm = (props: Props) => {
  const { config, kind } = props;
  const [unavailable, setUnavailable] = useState(false);
  const stripe = useMemo(
    () =>
      isStripePublishableKey(config.publishable_key) ? stripeForKey(config.publishable_key) : null,
    [config.publishable_key],
  );
  useEffect(() => {
    let cancelled = false;
    void stripe?.then((sdk) => {
      if (!cancelled && !sdk) setUnavailable(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stripe]);
  const options = useMemo<StripeElementsOptions | null>(() => {
    const base = {
      currency: "brl",
      allowedPaymentMethodTypes: ["card"],
      locale: "pt-BR" as const,
      appearance: {
        theme: "stripe" as const,
        variables: {
          borderRadius: "12px",
          colorPrimary:
            typeof document === "undefined"
              ? undefined
              : getComputedStyle(document.documentElement)
                  .getPropertyValue("--lectum-primary")
                  .trim() || undefined,
          fontFamily: "system-ui, sans-serif",
        },
      },
    };
    if (kind === "checkout") {
      if (!isStripeBillingQuoteValid(config.quote)) return null;
    }
    return { ...base, mode: "setup" };
  }, [config.quote, kind]);
  if (!stripe || !options || unavailable)
    return (
      <InlineAlert variant="warning">
        Não foi possível abrir o formulário seguro. Recarregue esta página para verificar novamente.
      </InlineAlert>
    );
  return (
    <Elements stripe={stripe} options={options}>
      <PaymentForm {...props} />
    </Elements>
  );
};
