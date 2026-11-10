import { createHash } from "node:crypto";
import Stripe from "stripe";
import type {
  GatewayCancelSubscriptionInput,
  GatewaySubscriptionInput,
  GatewaySubscriptionPlanInput,
  GatewaySubscriptionResult,
  GatewayUpdateSubscriptionCardInput,
  PaymentGateway,
  VerifyWebhookSignatureInput,
} from "./PaymentGateway";
import {
  isStripeTerminalSubscriptionStatus,
  stripeCancellationMutation,
} from "./stripe-cancellation";
import {
  applyStripeSubscriptionSetup,
  confirmStripeCard,
  createStripeCardSetup,
  readStripeSubscriptionCard,
  type StripeSubscriptionCardInput,
  type StripeSubscriptionSetupInput,
} from "./stripe-card";
import { initialPaidCheckoutIntent, initialUnpaidCheckoutIntent } from "./stripe-checkout-proof";
import { readStripeConfiguration, STRIPE_API_VERSION } from "./stripe-config";
import { stripeCreditApi } from "./stripe-credit-api";
import { StripeGatewayError, stripeFailure } from "./stripe-error";
import {
  listStripeFinancialInvoices,
  projectStripeFinancialContract,
  readStripeFinancialInvoice,
} from "./stripe-financial";
import type { StripeFinancialTarget } from "./stripe-financial-types";
import { readStripePaidInvoice } from "./stripe-invoice";
import {
  assertStripeMode,
  parseStripePlan,
  projectStripeSetup,
  projectStripeSubscription,
  requireLocalReference,
  requireStripeClientSecret,
  requireStripeId,
  type StripeInvoiceEvidence,
  stripeId,
} from "./stripe-projection";
import { isStripeCheckoutCapabilityReady } from "./stripe-readiness";
import {
  findStripeCardSetup,
  findStripeCustomer,
  findStripeSubscription,
  type StripeCustomerRecoveryInput,
  type StripeSubscriptionRecoveryInput,
} from "./stripe-recovery";
import type {
  StripeCardSetupInput,
  StripeEmbeddedInput,
  StripeEmbeddedResult,
  StripeWebhookReference,
} from "./stripe-types";
import { projectStripeWebhook } from "./stripe-webhook";
import { resolveStripeWebhookSubscription } from "./stripe-webhook-resolution";

const expandedSubscription = ["latest_invoice.confirmation_secret", "pending_setup_intent"];

export class StripeAdapter implements PaymentGateway {
  private readonly config = readStripeConfiguration();
  private readonly client = new Stripe(this.config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    timeout: 10_000,
    maxNetworkRetries: 0,
    telemetry: false,
  });
  private identityCheck: Promise<void> | null = null;
  private identityExpiresAt = 0;
  private chargesReady = false;
  private readonly credit = stripeCreditApi({
    client: this.client,
    identity: () => this.identity,
    run: (action) => this.run(action),
    ready: () => this.verifyCheckoutReadiness(),
    key: (operation, reference) => this.key(operation, reference),
    canonical: (subscription) => this.canonical(subscription),
  });
  createCheckoutSetup = this.credit.createCheckoutSetup;
  findCheckoutSetup = this.credit.findCheckoutSetup;
  readCheckoutSetupCredit = this.credit.readCheckoutSetupCredit;
  createCreditSubscription = this.credit.createCreditSubscription;
  findCreditSubscription = this.credit.findCreditSubscription;
  ensureCreditCollectionHold = this.credit.ensureCreditCollectionHold;
  assignCreditSubscriptionCard = this.credit.assignCreditSubscriptionCard;
  getCreditCollectionInvoice = this.credit.getCreditCollectionInvoice;
  finalizeCreditCollectionInvoice = this.credit.finalizeCreditCollectionInvoice;
  createCreditInvoiceIntent = this.credit.createCreditInvoiceIntent;
  findCreditInvoiceIntent = this.credit.findCreditInvoiceIntent;
  readCreditInvoiceIntent = this.credit.readCreditInvoiceIntent;
  attachCreditInvoiceIntent = this.credit.attachCreditInvoiceIntent;
  confirmCreditInvoiceIntent = this.credit.confirmCreditInvoiceIntent;
  cancelCreditInvoiceIntent = this.credit.cancelCreditInvoiceIntent;

  get identity() {
    return { accountId: this.config.accountId, mode: this.config.mode };
  }
  get publicConfiguration() {
    return { ...this.identity, publishableKey: this.config.publishableKey };
  }

  private key(operation: string, reference: string) {
    return `lectum-${operation}-${createHash("sha256").update(`${this.config.accountId}:${this.config.mode}:${reference}`).digest("hex")}`;
  }

  async verifyIdentity(): Promise<void> {
    if (Date.now() >= this.identityExpiresAt) {
      this.identityCheck = null;
      this.identityExpiresAt = Date.now() + 60_000;
    }
    this.identityCheck ??= (async () => {
      const account = await this.client.accounts.retrieve(null);
      if (account.id !== this.config.accountId) throw new StripeGatewayError("account_mismatch");
      this.chargesReady = isStripeCheckoutCapabilityReady(this.config.mode, account);
    })();
    try {
      await this.identityCheck;
    } catch (error) {
      this.identityCheck = null;
      this.chargesReady = false;
      throw stripeFailure(error);
    }
  }

  async verifyCheckoutReadiness(): Promise<void> {
    await this.verifyIdentity();
    if (!this.chargesReady) {
      // Allow a later call to recheck after account onboarding; never retry a financial operation.
      this.identityCheck = null;
      throw new StripeGatewayError("account_not_ready");
    }
  }

  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      await this.verifyIdentity();
      return await action();
    } catch (error) {
      throw stripeFailure(error);
    }
  }

  private async subscription(id: string) {
    const expected = requireStripeId(id, "sub");
    const subscription = await this.client.subscriptions.retrieve(expected, {
      expand: expandedSubscription,
    });
    if (subscription.id !== expected) throw new StripeGatewayError("resource_mismatch");
    assertStripeMode(subscription.livemode, this.identity);
    return subscription;
  }

  private async canonical(subscription: Stripe.Subscription) {
    let evidence: StripeInvoiceEvidence = { verified: false, refundedCents: 0, disputed: false };
    const invoice =
      typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    if (invoice?.status === "paid" && invoice.amount_paid > 0) {
      try {
        const paidInvoice = await readStripePaidInvoice(this.client, invoice, this.identity);
        evidence = { ...paidInvoice, paymentIntentId: paidInvoice.financialFacts.paymentIntentId };
      } catch (error) {
        if (!(error instanceof StripeGatewayError) || error.kind !== "payment_not_eligible")
          throw error;
      }
    }
    return projectStripeSubscription(subscription, this.identity, evidence);
  }

  getStripePlan(id: string) {
    return this.run(async () => {
      const expected = requireStripeId(id, "price");
      const price = await this.client.prices.retrieve(expected, { expand: ["product"] });
      if (price.id !== expected) throw new StripeGatewayError("resource_mismatch");
      return parseStripePlan(price, this.identity);
    });
  }

  createCustomer(input: { userId: string; email: string; idempotencyKey: string }) {
    return this.run(async () => {
      const userId = requireLocalReference(input.userId);
      const reference = requireLocalReference(input.idempotencyKey);
      const email = input.email.trim();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new StripeGatewayError("resource_invalid");
      const customer = await this.client.customers.create(
        { email, metadata: { lectum_user_id: userId, lectum_customer_id: reference } },
        { idempotencyKey: this.key("customer", reference) },
      );
      assertStripeMode(customer.livemode, this.identity);
      return { customerId: requireStripeId(customer.id, "cus") };
    });
  }

  createEmbeddedSubscription(input: StripeEmbeddedInput): Promise<StripeEmbeddedResult> {
    return this.run(async () => {
      await this.verifyCheckoutReadiness();
      const attemptId = requireLocalReference(input.attemptId);
      const localId = requireLocalReference(input.subscriptionId);
      const customerId = requireStripeId(input.customerId, "cus");
      const price = await this.getStripePlan(input.priceId);
      if (!price.active) throw new StripeGatewayError("contract_invalid");
      const customer = await this.client.customers.retrieve(customerId);
      if (
        customer.deleted ||
        customer.id !== customerId ||
        customer.email !== input.payerEmail.trim()
      )
        throw new StripeGatewayError("resource_mismatch");
      assertStripeMode(customer.livemode, this.identity);
      const start = input.startDate ? new Date(input.startDate) : null;
      if (start && (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()))
        throw new StripeGatewayError("resource_invalid");
      const subscription = await this.client.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: price.priceId, quantity: 1 }],
          payment_behavior: "default_incomplete",
          collection_method: "charge_automatically",
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription",
          },
          metadata: { lectum_subscription_id: localId, lectum_attempt_id: attemptId },
          ...(start
            ? {
                trial_end: Math.floor(start.getTime() / 1000),
                trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
              }
            : {}),
          expand: expandedSubscription,
        },
        { idempotencyKey: this.key("subscription", attemptId) },
      );
      return this.embeddedResult(subscription);
    });
  }

  private async embeddedResult(subscription: Stripe.Subscription): Promise<StripeEmbeddedResult> {
    const canonical = await this.canonical(subscription);
    const result = {
      subscriptionId: canonical.subscriptionId,
      status: canonical.status,
      gatewayStatus: canonical.gatewayStatus,
      currentPeriodEnd: canonical.currentPeriodEnd,
    };
    if (isStripeTerminalSubscriptionStatus(canonical.gatewayStatus))
      return { ...result, intentKind: "none" };
    const setup =
      typeof subscription.pending_setup_intent === "object"
        ? subscription.pending_setup_intent
        : null;
    if (setup) {
      assertStripeMode(setup.livemode, this.identity);
      if (stripeId(setup.customer, "cus") !== canonical.customerId)
        throw new StripeGatewayError("resource_mismatch");
      if (setup.status === "succeeded")
        return { ...result, intentKind: "none", intentId: requireStripeId(setup.id, "seti") };
      if (setup.client_secret)
        return {
          ...result,
          intentKind: "setup",
          clientSecret: requireStripeClientSecret(
            setup.client_secret,
            requireStripeId(setup.id, "seti"),
          ),
          intentId: requireStripeId(setup.id, "seti"),
        };
    }
    const invoice =
      typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    const originalUnpaidIntent = initialUnpaidCheckoutIntent(invoice, canonical);
    if (originalUnpaidIntent) return { ...result, ...originalUnpaidIntent };
    const originalPaidIntent = initialPaidCheckoutIntent(invoice, canonical);
    if (originalPaidIntent) return { ...result, ...originalPaidIntent };
    if (
      canonical.latestInvoicePaymentVerified ||
      (canonical.gatewayStatus === "trialing" && canonical.defaultPaymentMethodId)
    )
      return { ...result, intentKind: "none" };
    throw new StripeGatewayError("contract_invalid");
  }

  retrieveEmbeddedSubscription(id: string) {
    return this.run(async () => this.embeddedResult(await this.subscription(id)));
  }
  getStripeSubscription(id: string) {
    return this.run(async () => this.canonical(await this.subscription(id)));
  }

  createCardSetup(input: StripeCardSetupInput) {
    return this.run(async () => {
      await this.verifyCheckoutReadiness();
      return createStripeCardSetup(
        this.client,
        await this.subscription(input.subscriptionId),
        this.identity,
        input,
        this.key("card-setup", requireLocalReference(input.attemptId)),
      );
    });
  }

  retrieveSetup(id: string) {
    return this.run(async () => {
      const expected = requireStripeId(id, "seti");
      const setup = await this.client.setupIntents.retrieve(expected);
      if (setup.id !== expected) throw new StripeGatewayError("resource_mismatch");
      return projectStripeSetup(setup, this.identity);
    });
  }

  confirmCard(input: StripeCardSetupInput & { setupIntentId: string }) {
    return this.run(async () =>
      confirmStripeCard(
        this.client,
        await this.subscription(input.subscriptionId),
        this.identity,
        input,
        this.key("card-confirm", requireLocalReference(input.attemptId)),
      ),
    );
  }

  applySubscriptionSetup(input: StripeSubscriptionSetupInput) {
    return this.run(async () =>
      applyStripeSubscriptionSetup(
        this.client,
        await this.subscription(input.subscriptionId),
        this.identity,
        input,
        this.key("subscription-setup-confirm", requireLocalReference(input.attemptId)),
      ),
    );
  }

  readSubscriptionCard(input: StripeSubscriptionCardInput) {
    return this.run(async () =>
      readStripeSubscriptionCard(
        this.client,
        await this.subscription(input.subscriptionId),
        this.identity,
        input,
      ),
    );
  }

  findCustomerForOperation(input: StripeCustomerRecoveryInput) {
    return this.run(() => findStripeCustomer(this.client, this.identity, input));
  }

  findSubscriptionForOperation(input: StripeSubscriptionRecoveryInput) {
    return this.run(async () => {
      const id = await findStripeSubscription(this.client, this.identity, input);
      return id ? this.embeddedResult(await this.subscription(id)) : null;
    });
  }

  findCardSetupForOperation(input: StripeCardSetupInput) {
    return this.run(() => findStripeCardSetup(this.client, this.identity, input));
  }

  async getSubscription(id: string) {
    const value = await this.getStripeSubscription(id);
    return {
      gateway_subscription_id: value.subscriptionId,
      status: value.status,
      gateway_status: value.gatewayStatus,
      external_reference: value.localSubscriptionId,
      next_payment_date: value.currentPeriodEnd?.toISOString() ?? null,
      raw: value,
    };
  }

  async getSubscriptionPlan(id: string) {
    const value = await this.getStripePlan(id);
    return {
      gateway_plan_id: value.priceId,
      gateway_status: value.active ? "active" : "inactive",
      amount_cents: value.amountCents,
      raw: value,
    };
  }

  cancelSubscription({
    gatewaySubscriptionId,
  }: GatewayCancelSubscriptionInput): Promise<GatewaySubscriptionResult> {
    return this.run(async () => {
      // Do not consult charge/payment evidence to let a customer stop future collection.
      const remote = await this.subscription(gatewaySubscriptionId);
      const current = projectStripeSubscription(remote, this.identity);
      const mutation = stripeCancellationMutation(remote.status);
      if (mutation.kind === "unchanged")
        return {
          gateway_subscription_id: current.subscriptionId,
          status: "cancelada",
          gateway_status: current.gatewayStatus,
          raw: current,
        };
      const updated =
        mutation.kind === "cancel"
          ? await this.client.subscriptions.cancel(current.subscriptionId, mutation.params)
          : await this.client.subscriptions.update(current.subscriptionId, mutation.params, {
              idempotencyKey: this.key(
                "cancel-renewal",
                `${current.subscriptionId}:${current.currentPeriodEnd?.toISOString() ?? "none"}`,
              ),
            });
      assertStripeMode(updated.livemode, this.identity);
      if (
        updated.id !== current.subscriptionId ||
        (mutation.kind === "cancel"
          ? !isStripeTerminalSubscriptionStatus(updated.status)
          : !updated.cancel_at_period_end)
      )
        throw new StripeGatewayError("contract_invalid");
      return {
        gateway_subscription_id: current.subscriptionId,
        status: "cancelada",
        gateway_status: updated.status,
        next_payment_date: null,
        raw: {
          ...current,
          status: "cancelada",
          gatewayStatus: updated.status,
          cancelAtPeriodEnd: updated.cancel_at_period_end,
        },
      };
    });
  }

  cancelImmediately(input: {
    subscriptionId: string;
    reason: "administrative" | "account_deletion" | "abandoned_incomplete";
  }): Promise<GatewaySubscriptionResult> {
    return this.run(async () => {
      if (!["administrative", "account_deletion", "abandoned_incomplete"].includes(input.reason))
        throw new StripeGatewayError("operation_unsupported");
      const current = projectStripeSubscription(
        await this.subscription(input.subscriptionId),
        this.identity,
      );
      if (isStripeTerminalSubscriptionStatus(current.gatewayStatus)) {
        return {
          gateway_subscription_id: current.subscriptionId,
          status: "cancelada",
          gateway_status: current.gatewayStatus,
          raw: current,
        };
      }
      if (
        input.reason === "abandoned_incomplete" &&
        (!["incomplete", "trialing"].includes(current.gatewayStatus) ||
          current.latestInvoicePaid ||
          current.latestInvoiceAmountPaid > 0)
      )
        throw new StripeGatewayError("operation_unsupported");
      const result = await this.client.subscriptions.cancel(current.subscriptionId, {
        invoice_now: false,
        prorate: false,
      });
      assertStripeMode(result.livemode, this.identity);
      if (
        result.id !== current.subscriptionId ||
        !isStripeTerminalSubscriptionStatus(result.status)
      )
        throw new StripeGatewayError("contract_invalid");
      return {
        gateway_subscription_id: current.subscriptionId,
        status: "cancelada",
        gateway_status: result.status,
        raw: { ...current, status: "cancelada", gatewayStatus: result.status },
      };
    });
  }

  getInvoicePayment(_type: "payment" | "subscription_authorized_payment" | "invoice", id: string) {
    return this.run(async () => {
      const expected = requireStripeId(id, "in");
      const invoice = await this.client.invoices.retrieve(expected);
      if (invoice.id !== expected) throw new StripeGatewayError("resource_mismatch");
      return (await readStripePaidInvoice(this.client, invoice, this.identity)).payment;
    });
  }

  async getAuthorizedPayment(id: string) {
    const payment = await this.getInvoicePayment("invoice", id);
    return {
      gateway_subscription_id: payment.subscriptionId,
      gateway_payment_id: payment.paymentId,
      external_reference: payment.externalReference,
      status: payment.status,
      status_detail: null,
    };
  }

  getSubscriptionPaymentSummary(id: string) {
    return this.run(async () => {
      const expected = requireStripeId(id, "sub");
      const invoices = await this.client.invoices.list({
        subscription: expected,
        status: "paid",
        limit: 11,
      });
      if (invoices.has_more || invoices.data.length > 10)
        throw new StripeGatewayError("operation_unsupported");
      let total = 0;
      let quantity = 0;
      let latest: { amount: number; date: Date } | null = null;
      for (const invoice of invoices.data) {
        if (!invoice.amount_paid) continue;
        const payment = (await readStripePaidInvoice(this.client, invoice, this.identity)).payment;
        if (
          payment.subscriptionId !== expected ||
          payment.status !== "approved" ||
          payment.refundedCents
        )
          continue;
        total += payment.amountCents;
        quantity++;
        if (payment.paidAt && (!latest || payment.paidAt > latest.date))
          latest = { amount: payment.amountCents, date: payment.paidAt };
      }
      return {
        gateway_subscription_id: expected,
        charged_amount_cents: total,
        charged_quantity: quantity,
        last_charged_amount_cents: latest?.amount ?? null,
        last_charged_at: latest?.date.toISOString() ?? null,
        raw: null,
      };
    });
  }

  async parseSignedWebhook(raw: Buffer, signature: string) {
    if (
      !this.config.webhookSecret ||
      raw.length > 256 * 1024 ||
      !signature ||
      signature.length > 1024
    )
      throw new StripeGatewayError("signature_invalid");
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(raw, signature, this.config.webhookSecret, 300);
    } catch {
      throw new StripeGatewayError("signature_invalid");
    }
    return this.run(async () => projectStripeWebhook(event, this.identity));
  }

  /** Read-only resolution after a verified event has been durably stored in the inbox. */
  resolveWebhookSubscription(reference: StripeWebhookReference): Promise<string | null> {
    return this.run(() => resolveStripeWebhookSubscription(this.client, this.identity, reference));
  }

  getFinancialContract(target: StripeFinancialTarget) {
    return this.run(async () =>
      projectStripeFinancialContract(
        await this.client.subscriptions.retrieve(requireStripeId(target.subscriptionId, "sub")),
        this.identity,
        target,
      ),
    );
  }

  listFinancialInvoices(
    target: StripeFinancialTarget,
    input: { cursor?: string | null; cutoff: Date; limit: number },
  ) {
    return this.run(() => listStripeFinancialInvoices(this.client, this.identity, target, input));
  }

  getFinancialInvoice(target: StripeFinancialTarget, invoiceId: string, cutoff: Date) {
    return this.run(() =>
      readStripeFinancialInvoice(this.client, this.identity, target, invoiceId, cutoff),
    );
  }

  verifyWebhookSignature(_input: VerifyWebhookSignatureInput): boolean {
    return false;
  }
  parseWebhookEvent(_body: unknown): null {
    return null;
  }
  async createSubscriptionPlan(_input: GatewaySubscriptionPlanInput): Promise<never> {
    throw new StripeGatewayError("operation_unsupported");
  }
  async createSubscription(_input: GatewaySubscriptionInput): Promise<never> {
    throw new StripeGatewayError("operation_unsupported");
  }
  async updateSubscriptionCard(_input: GatewayUpdateSubscriptionCardInput): Promise<never> {
    throw new StripeGatewayError("operation_unsupported");
  }
}
