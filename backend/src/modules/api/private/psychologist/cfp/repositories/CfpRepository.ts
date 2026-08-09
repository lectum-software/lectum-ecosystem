import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_registry_check, psychologist_profile } from "@/interfaces/objects";
import { parseCrpRegistrationDate } from "@/utils/professional-experience";
import { buildCrpFromRegistryResult } from "@/utils/professional-registry";
import { activeProfessionalCourtesyEntitlementWhere } from "@/utils/subscription-entitlement";
import type { CfpResult, CfpSearchBody, StoredRegistryCheckRaw } from "../DTOs/ICfpDTO";
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
      where: {
        id: props.psychologistId,
        deleted: false,
        cfp_verified_at: null,
        crp_status: {
          not: "aprovado",
        },
        NOT: {
          subscriptions: {
            some: activeProfessionalCourtesyEntitlementWhere(),
          },
        },
      },
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

  async confirmResult(props: { check: professional_registry_check; result: CfpResult }): Promise<{
    id: string;
    cpf: string | null;
    crp: string | null;
    crp_status: string;
    cfp_verified_at: Date | null;
  }> {
    const raw = props.check.raw as StoredRegistryCheckRaw | null;
    const confirmedAt = new Date();
    const cpf = normalizeDigits(props.check.cpf) || null;
    const crp = buildCrpFromRegistryResult(props.result) || props.check.registro || null;
    const crpRegistrationDate = parseCrpRegistrationDate(props.result.data_inscricao);

    return prisma.$transaction(async (tx) => {
      await tx.professional_registry_check.update({
        where: {
          id: props.check.id!,
        },
        data: {
          raw: {
            ...(raw || {
              provider: "infosimples",
              request: {},
              response: null,
              normalized_results: [],
            }),
            confirmed_result_key: props.result.key,
            confirmed_at: confirmedAt.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return tx.psychologist_profile.update({
        where: {
          id: props.check.psychologist_id!,
        },
        data: {
          cpf,
          crp,
          crp_registration_date: crpRegistrationDate,
          crp_status: "aprovado",
          cfp_verified_at: confirmedAt,
        },
        select: {
          id: true,
          cpf: true,
          crp: true,
          crp_status: true,
          cfp_verified_at: true,
        },
      });
    });
  }
}
