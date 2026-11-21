import { deliverMetaConversion } from "./meta-capi";
import type { MetaConversion } from "./meta-policy";
import { professionalActionCommitted } from "./professional-events";
import { userActionCommitted } from "./user-events";

// Domain hooks carry only a literal event kind. No health context, user ID,
// content, URL, card details, or attribution is collected while disabled.
// Replace the resolver only after consent + durable outbox integration is approved.
export function confirmedMarketingAction(conversion: MetaConversion) {
  return deliverMetaConversion({ conversion, resolve: async () => null });
}

export function registrationCommitted(role: string | null | undefined, source?: () => string) {
  if (role === "paciente" && source)
    return userActionCommitted("patient_registration", () => {
      const id = source();
      return { sourceRef: id, userId: id };
    });
  if (role === "paciente") return confirmedMarketingAction("patient_registration");
  if (role === "psicologo" && source)
    return professionalActionCommitted("professional_registration", source);
  if (role === "psicologo") return confirmedMarketingAction("professional_registration");
  return Promise.resolve({ status: "blocked" as const, reason: "unsupported_role" });
}
