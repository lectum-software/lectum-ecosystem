import { acceptStripeWebhook } from "@/modules/billing/stripe/inbox";
import type { IStripeWebhookDTO } from "../DTOs/IStripeWebhookDTO";
export const store = (input: IStripeWebhookDTO) => acceptStripeWebhook(input.body, input.signature);
