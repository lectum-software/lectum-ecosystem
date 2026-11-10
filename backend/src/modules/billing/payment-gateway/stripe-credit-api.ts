import type Stripe from "stripe";
import {
  attachCreditInvoiceIntent,
  cancelCreditInvoiceIntent,
  confirmCreditInvoiceIntent,
  createCreditInvoiceIntent,
  findCreditInvoiceIntent,
  readCreditInvoiceIntent,
} from "./stripe-credit-intent";
import {
  finalizeCreditCollectionInvoice,
  getCreditCollectionInvoice,
} from "./stripe-credit-invoice";
import {
  assertCreditSubscription,
  assignCreditSubscriptionCard,
  createCreditCheckoutSetup,
  createCreditSubscription,
  ensureCreditCollectionHold,
  findCreditCheckoutSetup,
  readCreditCheckoutSetup,
} from "./stripe-credit-setup";
import type {
  CreditCheckoutSetupInput,
  CreditCollectionScope,
  CreditIntentInput,
  CreditIntentReference,
  CreditSubscriptionScope,
} from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";
import { requireLocalReference } from "./stripe-projection";
import { findStripeSubscription } from "./stripe-recovery";
import type {
  StripeCanonicalSubscription,
  StripeEmbeddedInput,
  StripeIdentity,
} from "./stripe-types";

type Context = {
  client: Stripe;
  identity: () => StripeIdentity;
  run: <T>(action: () => Promise<T>) => Promise<T>;
  ready: () => Promise<void>;
  key: (operation: string, reference: string) => string;
  canonical: (subscription: Stripe.Subscription) => Promise<StripeCanonicalSubscription>;
};

/** Private composition: no raw SDK or automatic financial secret escapes this boundary. */
export const stripeCreditApi = (context: Context) => {
  const { client, run, ready, key, canonical } = context;
  const identity = context.identity;
  return {
    createCheckoutSetup: (input: CreditCheckoutSetupInput) =>
      run(async () => {
        await ready();
        return createCreditCheckoutSetup(
          client,
          identity(),
          input,
          key("credit-setup", requireLocalReference(input.attemptId)),
        );
      }),
    findCheckoutSetup: (input: CreditCheckoutSetupInput) =>
      run(() => findCreditCheckoutSetup(client, identity(), input)),
    readCheckoutSetupCredit: (input: CreditCheckoutSetupInput & { setupIntentId: string }) =>
      run(() => readCreditCheckoutSetup(client, identity(), input)),
    createCreditSubscription: (input: StripeEmbeddedInput) =>
      run(async () => {
        await ready();
        return canonical(
          await createCreditSubscription(
            client,
            identity(),
            input,
            key("credit-subscription", requireLocalReference(input.attemptId)),
          ),
        );
      }),
    findCreditSubscription: (input: StripeEmbeddedInput) =>
      run(async () => {
        const id = await findStripeSubscription(client, identity(), input);
        if (!id) return null;
        const subscription = await client.subscriptions.retrieve(id, {
          expand: ["latest_invoice"],
        });
        assertCreditSubscription(
          subscription,
          identity(),
          {
            subscriptionId: id,
            localSubscriptionId: input.subscriptionId,
            customerId: input.customerId,
          },
          false,
        );
        return canonical(subscription);
      }),
    ensureCreditCollectionHold: (input: CreditSubscriptionScope) =>
      run(async () =>
        canonical(
          await ensureCreditCollectionHold(
            client,
            identity(),
            input,
            key("credit-hold", input.subscriptionId),
          ),
        ),
      ),
    assignCreditSubscriptionCard: (input: CreditSubscriptionScope & { paymentMethodId: string }) =>
      run(() =>
        assignCreditSubscriptionCard(
          client,
          identity(),
          input,
          key("credit-card", `${input.subscriptionId}:${input.paymentMethodId}`),
        ),
      ),
    getCreditCollectionInvoice: (input: CreditCollectionScope) =>
      run(() => getCreditCollectionInvoice(client, identity(), input)),
    finalizeCreditCollectionInvoice: (input: CreditCollectionScope) =>
      run(() =>
        finalizeCreditCollectionInvoice(
          client,
          identity(),
          input,
          key("credit-finalize", input.invoiceId),
        ),
      ),
    createCreditInvoiceIntent: (input: CreditIntentInput) =>
      run(async () => {
        await ready();
        return createCreditInvoiceIntent(
          client,
          identity(),
          input,
          key("credit-intent", requireLocalReference(input.attemptId)),
        );
      }),
    findCreditInvoiceIntent: (input: CreditIntentInput) =>
      run(() => findCreditInvoiceIntent(client, identity(), input)),
    readCreditInvoiceIntent: (input: CreditIntentReference) =>
      run(() => readCreditInvoiceIntent(client, identity(), input)),
    attachCreditInvoiceIntent: (input: CreditIntentReference) =>
      run(() =>
        attachCreditInvoiceIntent(
          client,
          identity(),
          input,
          key("credit-attach", `${input.attemptId}:${input.invoiceId}:${input.intentId}`),
        ),
      ),
    confirmCreditInvoiceIntent: (
      input: CreditIntentReference & { sequence: number; offSession?: boolean },
    ) =>
      run(async () => {
        await ready();
        if (!Number.isSafeInteger(input.sequence) || input.sequence < 1 || input.sequence > 100)
          throw new StripeGatewayError("resource_invalid");
        return confirmCreditInvoiceIntent(
          client,
          identity(),
          input,
          key("credit-confirm", `${input.attemptId}:${input.intentId}:${input.sequence}`),
        );
      }),
    cancelCreditInvoiceIntent: (input: CreditIntentReference) =>
      run(() =>
        cancelCreditInvoiceIntent(
          client,
          identity(),
          input,
          key("credit-cancel", `${input.attemptId}:${input.intentId}`),
        ),
      ),
  };
};
