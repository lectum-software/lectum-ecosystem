import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import { StripeBillingError } from "./policy";
import { mayReplayStripeCreate, requestFingerprint } from "./recovery-policy";
import type { StripeBillingRepository } from "./repository";

export const obtainStripeCustomer = async (
  operation: billing_operation,
  email: string,
  repository: StripeBillingRepository,
  allowReplay: boolean,
) => {
  const gateway = getStripeGateway();
  if (!operation.customer_id) throw new StripeBillingError("billing_operation_conflict");
  const customer = await repository.customer(operation.customer_id, gateway.identity);
  if (!customer || customer.user_id !== operation.user_id)
    throw new StripeBillingError("billing_operation_conflict");
  if (customer.external_customer_id) return customer.external_customer_id;
  const recovered = await gateway.findCustomerForOperation({
    userId: operation.user_id,
    customerReferenceId: customer.id,
  });
  if (recovered) {
    if (!(await repository.recoverCustomer(customer, recovered.customerId)).count)
      throw new StripeBillingError("billing_operation_pending");
    return recovered.customerId;
  }
  const fingerprint = requestFingerprint("customer", [
    customer.id,
    customer.user_id,
    customer.mode,
    customer.account_id,
    email.trim(),
  ]);
  if (
    !allowReplay ||
    !mayReplayStripeCreate({
      state: customer.state,
      createdAt: customer.created_at,
      attempts: operation.attempts,
      storedFingerprint: customer.request_fingerprint,
      expectedFingerprint: fingerprint,
    })
  ) {
    throw new StripeBillingError("billing_operation_review_required");
  }
  const claim = await repository.claimCustomer(customer, fingerprint);
  if (!claim) throw new StripeBillingError("billing_operation_pending");
  try {
    const created = await gateway.createCustomer({
      userId: operation.user_id,
      email,
      idempotencyKey: customer.id,
    });
    if (
      !(await repository.finishCustomer(customer.id, claim.lease_token, created.customerId)).count
    ) {
      const latest = await repository.customer(customer.id, gateway.identity);
      if (latest?.external_customer_id !== created.customerId)
        throw new StripeBillingError("billing_operation_pending");
    }
    return created.customerId;
  } catch {
    await repository.finishCustomer(customer.id, claim.lease_token, null);
    throw new StripeBillingError("billing_operation_review_required");
  }
};
