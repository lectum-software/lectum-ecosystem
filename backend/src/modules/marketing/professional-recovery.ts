import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { readMetaConfig } from "./meta-config";
import { metaTransmissionDecision } from "./meta-policy";
import { persistProfessionalEvent } from "./professional-events";

type Conversion = "professional_registration" | "professional_checkout";
const cursors: Partial<Record<Conversion, string>> = {};
// Set only as part of a reviewed activation; never backfill pre-activation actions.
const REVIEWED_RECOVERY_START: Date | null = null;

// Canonical records are the durable recovery source; cursors only bound work per tick.
export async function recoverProfessionalPage(
  conversion: Conversion,
  afterId: string | undefined,
  now = new Date(),
  take = 50,
  since = now,
) {
  if (!Number.isSafeInteger(take) || take < 1 || take > 100) throw new Error("invalid_page_size");
  const time = { gt: new Date(now.getTime() - 7 * 86_400_000), gte: since, lte: now };
  const owner = {
    active: true,
    deleted: false,
    role: "psicologo",
    marketing_consent: { is: { revoked_at: null, expires_at: { gt: now } } },
  };
  const rows =
    conversion === "professional_registration"
      ? await prisma.user.findMany({
          where: { ...owner, createdAt: time, ...(afterId ? { id: { gt: afterId } } : {}) },
          select: { id: true },
          orderBy: { id: "asc" },
          take,
        })
      : await prisma.billing_operation.findMany({
          where: {
            gateway: "stripe",
            mode: "live",
            kind: "checkout",
            intent: "subscription",
            state: { in: ["requires_confirmation", "processing", "complete"] },
            OR: [
              { provider_intent_id: { not: null } },
              { provider_setup_intent_id: { not: null } },
            ],
            created_at: time,
            ...(afterId ? { id: { gt: afterId } } : {}),
          },
          select: { id: true },
          orderBy: { id: "asc" },
          take,
        });
  let queued = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await withSerializableTransaction((tx) =>
        persistProfessionalEvent(tx, conversion, row.id, now),
      );
      if (result.status === "queued") queued++;
    } catch {
      // Replay in the next scan retains canonical timestamp and durable dedup identity.
      failed++;
    }
  }
  return {
    scanned: rows.length,
    queued,
    failed,
    next: rows.length === take ? rows[rows.length - 1].id : undefined,
  };
}

export async function recoverProfessionalEvents() {
  if (!REVIEWED_RECOVERY_START) return;
  const conversions = ["professional_registration", "professional_checkout"] as const;
  if (!conversions.some((conversion) => metaTransmissionDecision(conversion).allowed)) return;
  const config = readMetaConfig();
  if (!config.enabled || !config.datasetId || !config.apiVersion || !config.token) return;
  for (const conversion of conversions) {
    if (!metaTransmissionDecision(conversion).allowed) continue;
    const result = await recoverProfessionalPage(
      conversion,
      cursors[conversion],
      new Date(),
      50,
      REVIEWED_RECOVERY_START,
    );
    cursors[conversion] = result.next;
  }
}
