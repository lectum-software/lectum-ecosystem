export type ProfessionalPixelEvent = "CompleteRegistration" | "InitiateCheckout";

// Deliberately no script loader, fbq global, cookie, storage, URL/referrer read or
// form listener. A Pixel ID and an enabled env alone never grant approval.
export function professionalCheckoutReady() {
  return { transmitted: false as const, reason: "pending_compliance_review" as const };
}

// Pure command preparation for the future isolated, consented Pixel integration.
// Never invoke on a health/community route. Subscribe remains server-only.
export function prepareProfessionalPixelCommands(input: {
  pixelId: string;
  eventName: ProfessionalPixelEvent;
  eventId: string;
}) {
  if (
    !/^\d{5,25}$/.test(input.pixelId) ||
    !/^[a-f0-9]{64}$/.test(input.eventId) ||
    !["CompleteRegistration", "InitiateCheckout"].includes(input.eventName)
  )
    return null;
  return [
    ["set", "autoConfig", false, input.pixelId],
    ["init", input.pixelId],
    [
      "trackSingle",
      input.pixelId,
      input.eventName,
      input.eventName === "CompleteRegistration" ? { account_type: "professional" } : {},
      { eventID: input.eventId },
    ],
  ] as const;
}
