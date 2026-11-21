import { z } from "zod";

const userActionSchema = z
  .object({
    action: z.enum(["registration_completed", "whatsapp_clicked", "publication_created"]),
  })
  .strict();

const eventNames = {
  registration_completed: "CompleteRegistration",
  whatsapp_clicked: "Contact",
  publication_created: "forum_post",
} as const;

// Local review descriptor only, deliberately not a CAPI payload or delivery candidate.
// Reject extra fields instead of silently removing context from a real event.
export function previewUserEvent(input: unknown) {
  const parsed = userActionSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    transmissionAllowed: false as const,
    status: "preview_only" as const,
    event: { event_name: eventNames[parsed.data.action] },
  };
}
