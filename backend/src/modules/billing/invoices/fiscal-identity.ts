import { z } from "zod";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  asStoredRaw,
  extractStoredResults,
} from "@/modules/api/private/psychologist/cfp/domain/stored-results";
import { buildCrpFromRegistryResult, normalizeStoredCrp } from "@/utils/professional-registry";

export const fiscalNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(150)
  .refine((value) =>
    [...value].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
  );
export const fiscalCpf = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export const fiscalIdentityInputSchema = z.object({
  full_name: fiscalNameSchema,
  revision: z.string().min(1).max(120).nullable(),
  profile_revision: z.iso.datetime(),
});

type Profile = { id: string; cpf: string | null; crp: string | null; cfp_verified_at: Date | null };
type Check = Parameters<typeof extractStoredResults>[0];
type Db = Pick<Prisma.TransactionClient, "fiscal_identity_event" | "professional_registry_check">;

export function confirmedFiscalName(profile: Profile, check: Check): string | null {
  const raw = asStoredRaw(check.raw);
  if (
    !profile.cfp_verified_at ||
    !profile.cpf ||
    check.deleted ||
    check.psychologist_id !== profile.id ||
    check.provider !== "infosimples" ||
    !check.found ||
    fiscalCpf(check.cpf) !== fiscalCpf(profile.cpf) ||
    raw?.confirmed_at !== profile.cfp_verified_at.toISOString() ||
    fiscalCpf(raw.request?.cpf) !== fiscalCpf(profile.cpf)
  )
    return null;
  const result = extractStoredResults(check).find((item) => item.key === raw.confirmed_result_key);
  if (
    !result?.active ||
    normalizeStoredCrp(buildCrpFromRegistryResult(result)) !== normalizeStoredCrp(profile.crp)
  )
    return null;
  const name = fiscalNameSchema.safeParse(result.nome);
  return name.success ? name.data : null;
}

export async function getFiscalIdentity(profile: Profile, db: Db = prisma) {
  const latest = await db.fiscal_identity_event.findFirst({
    where: { psychologist_id: profile.id },
    orderBy: { sequence: "desc" },
  });
  if (latest) {
    return fiscalCpf(latest.cpf) === fiscalCpf(profile.cpf)
      ? {
          full_name: latest.full_name,
          source: latest.source,
          updated_at: latest.created_at,
          actor_id: latest.actor_id,
          registry_check_id: latest.registry_check_id,
        }
      : null;
  }
  // Reuse only the exact historical CFP confirmation; never a display name or a search hit.
  if (!profile.cfp_verified_at || !profile.cpf) return null;
  const checks = await db.professional_registry_check.findMany({
    where: {
      psychologist_id: profile.id,
      provider: "infosimples",
      deleted: false,
      found: true,
      cpf: fiscalCpf(profile.cpf),
      raw: { path: ["confirmed_at"], equals: profile.cfp_verified_at.toISOString() },
    },
  });
  if (checks.length !== 1) return null;
  const fullName = confirmedFiscalName(profile, checks[0]);
  return fullName
    ? {
        full_name: fullName,
        source: "infosimples",
        updated_at: profile.cfp_verified_at,
        actor_id: null,
        registry_check_id: checks[0].id,
      }
    : null;
}
