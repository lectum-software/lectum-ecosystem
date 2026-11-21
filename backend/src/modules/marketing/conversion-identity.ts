import { createHmac } from "node:crypto";
import type { MetaConversion } from "./meta-policy";

// Persist and reuse this ID for both channels and retries. This helper does not
// replace a durable unique ledger, nor authorize transmission of identifiers.
export function conversionEventId(
  conversion: MetaConversion,
  confirmedEntityId: string,
  secret: string,
) {
  if (secret.length < 32 || !confirmedEntityId || confirmedEntityId.length > 160) return null;
  return createHmac("sha256", secret)
    .update(JSON.stringify(["lectum-meta-v1", conversion, confirmedEntityId]))
    .digest("hex");
}
