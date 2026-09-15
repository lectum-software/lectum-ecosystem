import type { Prisma } from "@/external/generated/prisma/client";
import { activeProfessionalCourtesyEntitlementWhere } from "./subscription-entitlement";

// Re-evaluated by PostgreSQL when a concurrent writer releases the profile row.
// Rejection is not an invitation to replace the submitted identity automatically.
export const automaticRegistryIdentityWhere = (
  id: string,
): Prisma.psychologist_profileWhereInput => ({
  id,
  deleted: false,
  cfp_verified_at: null,
  crp_status: { notIn: ["aprovado", "rejeitado"] },
  NOT: { subscriptions: { some: activeProfessionalCourtesyEntitlementWhere() } },
});
