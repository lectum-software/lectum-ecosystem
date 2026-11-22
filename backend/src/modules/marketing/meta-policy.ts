export const META_CONVERSIONS = [
  "patient_registration",
  "patient_contact",
  "patient_community_post",
  "professional_registration",
  "professional_checkout",
  "professional_subscription",
] as const;

export type MetaConversion = (typeof META_CONVERSIONS)[number];
export type MetaEventName =
  | "CompleteRegistration"
  | "Contact"
  | "forum_post"
  | "InitiateCheckout"
  | "Subscribe";

type EventPolicy = {
  eventName: MetaEventName;
  externalStatus: "eligible" | "pending_compliance_review";
  confirmation:
    | "registration_committed"
    | "whatsapp_click"
    | "post_committed"
    | "checkout_started"
    | "first_payment_verified";
};

// Legacy patient_* keys do not imply a clinical relationship.
// patient_contact also covers consented guests (TASK-337).
// User event eligibility was authorized by the owner on 2026-11-20.
// Delivery still requires configured URLs, consent evidence and explicit enablement.
export const META_EVENT_POLICY: Readonly<Record<MetaConversion, EventPolicy>> = {
  patient_registration: {
    eventName: "CompleteRegistration",
    externalStatus: "eligible",
    confirmation: "registration_committed",
  },
  patient_contact: {
    eventName: "Contact",
    externalStatus: "eligible",
    confirmation: "whatsapp_click",
  },
  patient_community_post: {
    eventName: "forum_post",
    externalStatus: "eligible",
    confirmation: "post_committed",
  },
  professional_registration: {
    eventName: "CompleteRegistration",
    externalStatus: "eligible",
    confirmation: "registration_committed",
  },
  professional_checkout: {
    eventName: "InitiateCheckout",
    externalStatus: "pending_compliance_review",
    confirmation: "checkout_started",
  },
  professional_subscription: {
    eventName: "Subscribe",
    externalStatus: "pending_compliance_review",
    confirmation: "first_payment_verified",
  },
};

export function metaTransmissionDecision(conversion: MetaConversion) {
  const reason = META_EVENT_POLICY[conversion].externalStatus;
  return { allowed: reason === "eligible", reason };
}
