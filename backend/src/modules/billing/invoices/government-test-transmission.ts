import { z } from "zod";

const transmissionSchema = z.object({
  status: z.enum(["available", "simulated", "unknown"]),
  reason_code: z.unknown().optional(),
  checked_at: z.unknown().optional(),
});
const reasonSchema = z.enum([
  "cnc_missing_in_test",
  "municipality_missing_in_test",
  "registry_missing_in_test",
]);
const checkedAtSchema = z.string().max(40).datetime({ offset: true });

export type GovernmentTestTransmission = {
  status: z.infer<typeof transmissionSchema>["status"];
  reasonCode: z.infer<typeof reasonSchema> | "other" | null;
  checkedAt: string | null;
};

/** Diagnostic only: historical readiness never authorizes an issuance or proves its outcome. */
export function governmentTestTransmission(raw: unknown): GovernmentTestTransmission {
  const parsed = transmissionSchema.safeParse(raw);
  if (!parsed.success) return { status: "unknown", reasonCode: null, checkedAt: null };
  const reason = reasonSchema.safeParse(parsed.data.reason_code);
  const checkedAt = checkedAtSchema.safeParse(parsed.data.checked_at);
  return {
    status: parsed.data.status === "available" && reason.success ? "unknown" : parsed.data.status,
    reasonCode: reason.success
      ? reason.data
      : parsed.data.reason_code == null || parsed.data.reason_code === ""
        ? null
        : "other",
    checkedAt: checkedAt.success ? new Date(checkedAt.data).toISOString() : null,
  };
}
