import type { billing_operation } from "@/external/generated/prisma/client";
import { getStripeGateway } from "../payment-gateway";
import { type OperationState, publicOperationState } from "./policy";
import type { StripeBillingRepository } from "./repository";

export type IntentConfirmation = { type: "payment" | "setup"; client_secret: string };
export const operationResponse = (
  operation: Pick<billing_operation, "id" | "kind" | "state">,
  confirmation: IntentConfirmation | null = null,
  state?: OperationState,
) => ({
  operation: {
    id: operation.id,
    kind: operation.kind,
    state: state ?? publicOperationState(operation.state),
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
  const allowed =
    confirmation &&
    latest.state === "requires_confirmation" &&
    latest.intent_kind === confirmation.type &&
    latest.provider_intent_id &&
    confirmation.client_secret.startsWith(`${latest.provider_intent_id}_secret_`);
  return operationResponse(latest, allowed ? confirmation : null);
};
