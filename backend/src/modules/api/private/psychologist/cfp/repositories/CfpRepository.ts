import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_registry_check, psychologist_profile } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { parseCrpRegistrationDate } from "@/utils/professional-experience";
import {
  buildCrpFromRegistryResult,
  normalizeCrpRegistrationNumber,
} from "@/utils/professional-registry";
import { automaticRegistryIdentityWhere } from "@/utils/professional-registry-write";
import type {
  CfpConfirmationOutcome,
  CfpResult,
  CfpSearchBody,
  StoredRegistryCheckRaw,
} from "../DTOs/ICfpDTO";
import { asStoredRaw, extractStoredResults } from "../domain/stored-results";
import type { ICfpRepository } from "./interfaces/ICfpRepository";

const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

export class CfpRepository implements ICfpRepository {
  readonly profileRepository: ORM["psychologist_profile"];
  readonly checkRepository: ORM["professional_registry_check"];

  constructor() {
    this.profileRepository = prisma.psychologist_profile;
    this.checkRepository = prisma.professional_registry_check;
  }

  async getProfile(userId: string): Promise<psychologist_profile | null> {
    return this.profileRepository.findFirst({
      where: {
        user_id: userId,
        deleted: false,
      },
    });
  }

  async countCpfSearchAttempts(psychologistId: string): Promise<number> {
    return this.checkRepository.count({
      where: {
        psychologist_id: psychologistId,
        deleted: false,
        cpf: {
          not: null,
        },
      },
    });
  }

  async saveSubmittedCpf(props: { psychologistId: string; cpf: string }): Promise<void> {
    const cpf = normalizeDigits(props.cpf);
    if (!cpf) return;

    await this.profileRepository.updateMany({
      data: {
        cpf,
      },
      where: automaticRegistryIdentityWhere(props.psychologistId),
    });
  }

  async createCheck(props: {
    psychologistId: string;
    request: CfpSearchBody;
    found: boolean;
    raw: StoredRegistryCheckRaw;
  }): Promise<professional_registry_check> {
    return this.checkRepository.create({
      data: {
        psychologist_id: props.psychologistId,
        provider: "infosimples",
        cpf: normalizeDigits(props.request.cpf) || null,
        registro: props.request.registro || null,
        uf: props.request.uf || null,
        found: props.found,
        raw: props.raw as Prisma.InputJsonValue,
        checked_at: new Date(),
      },
    });
  }

  async getCheckById(
    id: string,
    psychologistId: string,
  ): Promise<professional_registry_check | null> {
    return this.checkRepository.findFirst({
      where: {
        id,
        psychologist_id: psychologistId,
        deleted: false,
      },
    });
  }

  async confirmResult(props: {
    check: professional_registry_check;
    result: CfpResult;
  }): Promise<CfpConfirmationOutcome> {
    return withSerializableTransaction<CfpConfirmationOutcome>(async (tx) => {
      const check = await tx.professional_registry_check.findFirst({
        where: {
          id: props.check.id!,
          psychologist_id: props.check.psychologist_id!,
          deleted: false,
        },
      });
      if (!check) return { ok: false, reason: "check_not_found" };
      const result = extractStoredResults(check).find((item) => item.key === props.result.key);
      if (!result) return { ok: false, reason: "result_not_found" };
      if (!result.active) return { ok: false, reason: "result_not_active" };

      const raw = asStoredRaw(check.raw)!;
      const confirmedAt = new Date();
      const identity = {
        cpf: normalizeDigits(check.cpf) || null,
        crp:
          buildCrpFromRegistryResult(result) ||
          normalizeCrpRegistrationNumber(check.registro) ||
          null,
        crp_registration_date: parseCrpRegistrationDate(result.data_inscricao),
      };
      // Claim the profile before changing the check. Concurrent confirmations and human
      // decisions serialize on this row; a losing confirmation must not rewrite history.
      const updated = await tx.psychologist_profile.updateMany({
        where: automaticRegistryIdentityWhere(check.psychologist_id),
        data: { ...identity, crp_status: "aprovado", cfp_verified_at: confirmedAt },
      });
      const profile = await tx.psychologist_profile.findFirst({
        where: { id: check.psychologist_id, deleted: false },
        select: {
          id: true,
          cpf: true,
          crp: true,
          crp_registration_date: true,
          crp_status: true,
          cfp_verified_at: true,
        },
      });
      if (!profile) return { ok: false, reason: "profile_locked" };

      if (updated.count === 0) {
        // Re-read after waiting on the profile, rather than trusting the pre-lock snapshot.
        const confirmed = await tx.professional_registry_check.findFirst({
          where: { id: check.id, psychologist_id: check.psychologist_id, deleted: false },
        });
        const confirmedRaw = asStoredRaw(confirmed?.raw);
        const exactRetry =
          profile.crp_status === "aprovado" &&
          profile.cfp_verified_at !== null &&
          confirmedRaw?.confirmed_result_key === result.key &&
          confirmedRaw.confirmed_at === profile.cfp_verified_at.toISOString() &&
          profile.cpf === identity.cpf &&
          profile.crp === identity.crp &&
          (profile.crp_registration_date?.getTime() ?? null) ===
            (identity.crp_registration_date?.getTime() ?? null);
        if (!exactRetry) return { ok: false, reason: "profile_locked" };
      } else {
        // A missing/deleted check causes rollback, never an approval without its evidence.
        await tx.professional_registry_check.update({
          where: { id: check.id, psychologist_id: check.psychologist_id, deleted: false },
          data: {
            raw: {
              ...raw,
              confirmed_result_key: result.key,
              confirmed_at: confirmedAt.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      }
      const { crp_registration_date: _registrationDate, ...publicProfile } = profile;
      return { ok: true, data: { result, profile: publicProfile } };
    });
  }
}
