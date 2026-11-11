import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import { type OperationState, publicOperationState } from "./policy";
import type { StripeBillingRepository } from "./repository";

export type IntentConfirmation = { type: "action" | "setup"; client_secret: string };
export const operationConfirmationKind = (
  operation: Pick<billing_operation, "kind" | "state"> &
    Partial<
      Pick<billing_operation, "intent_kind" | "provider_intent_id" | "provider_setup_intent_id">
    >,
) =>
  operation.state !== "requires_confirmation"
    ? null
    : operation.intent_kind === "payment"
      ? ("action" as const)
      : operation.provider_setup_intent_id || operation.intent_kind === "setup"
        ? ("setup" as const)
        : null;
export const operationPublicSummary = (
  operation: Pick<billing_operation, "id" | "kind" | "state"> & Partial<billing_operation>,
  state?: OperationState,
) => ({
  id: operation.id,
  kind: operation.kind === "collection" ? "checkout" : operation.kind,
  state: state ?? publicOperationState(operation.state),
  confirmation_kind: operationConfirmationKind(operation),
  payment_pending: operation.kind === "collection" || operation.intent_kind === "payment",
  ...(operation.last_error_code === "card_credit_required"
    ? { error_code: "billing_payment_method_credit_card_only" }
    : operation.last_error_code === "payment_method_required"
      ? { error_code: "billing_payment_method_update_required" }
      : {}),
});
export const operationResponse = (
  operation: Pick<billing_operation, "id" | "kind" | "state"> & Partial<billing_operation>,
  confirmation: IntentConfirmation | null = null,
  state?: OperationState,
) => ({
  operation: {
    ...operationPublicSummary(operation, state),
    confirmation,
  },
});

export const currentOperationResponse = async (
  operation: billing_operation,
  repository: StripeBillingRepository,
  confirmation: IntentConfirmation | null = null,
) => {
  const latest = await repository.operation(
    operation.id,
    operation.user_id,
    getStripeGateway().identity,
  );
  if (!latest) return operationResponse(operation, null, "review_required");
  const pinnedId =
    confirmation?.type === "setup" && latest.kind === "checkout"
      ? latest.provider_setup_intent_id
      : latest.provider_intent_id;
  const allowed =
    confirmation &&
    latest.state === "requires_confirmation" &&
    operationConfirmationKind(latest) === confirmation.type &&
    pinnedId &&
    confirmation.client_secret.startsWith(`${pinnedId}_secret_`);
  return operationResponse(latest, allowed ? confirmation : null);
};
