import { createHash } from "node:crypto";
import type { GatewayUpdateSubscriptionCardInput } from "./PaymentGateway";

export const buildCardUpdateIdempotencyKey = ({
  gatewaySubscriptionId,
  cardToken,
}: GatewayUpdateSubscriptionCardInput) =>
  createHash("sha256")
    .update(JSON.stringify(["lectum-preapproval-card", gatewaySubscriptionId, cardToken]))
    .digest("hex");
