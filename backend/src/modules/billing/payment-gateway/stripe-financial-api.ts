import type Stripe from "stripe";
import {
  listStripeFinancialInvoices,
  projectStripeFinancialContract,
  readStripeFinancialInvoice,
} from "./stripe-financial";
import type { StripeFinancialTarget } from "./stripe-financial-types";
import { requireStripeId } from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";
export const stripeFinancialApi = (
  client: Stripe,
  identity: () => StripeIdentity,
  run: <T>(action: () => Promise<T>) => Promise<T>,
) => ({
  getFinancialContract: (target: StripeFinancialTarget) =>
    run(async () =>
      projectStripeFinancialContract(
        await client.subscriptions.retrieve(requireStripeId(target.subscriptionId, "sub")),
        identity(),
        target,
      ),
    ),
  listFinancialInvoices: (
    target: StripeFinancialTarget,
    input: { cursor?: string | null; cutoff: Date; limit: number },
  ) => run(() => listStripeFinancialInvoices(client, identity(), target, input)),
  getFinancialInvoice: (target: StripeFinancialTarget, invoiceId: string, cutoff: Date) =>
    run(() => readStripeFinancialInvoice(client, identity(), target, invoiceId, cutoff)),
});
