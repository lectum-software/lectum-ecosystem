import prisma, { type ORM } from "@/infra/database/prisma";
import type { patient_profile } from "@/interfaces/objects";
import type { IProfileRepository } from "./interfaces/IProfileRepository";

export class ProfileRepository implements IProfileRepository {
  readonly repository: ORM["patient_profile"];

  constructor() {
    this.repository = prisma.patient_profile;
  }

  async getOrCreate(userId: string): Promise<patient_profile> {
    const existing = await this.repository.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (existing && !existing.deleted) return existing;

    if (existing?.deleted) {
      return this.repository.update({
        where: {
          user_id: userId,
        },
        data: {
          deleted: false,
          deletedAt: null,
        },
      });
    }

    return this.repository.create({
      data: {
        user_id: userId,
      },
    });
  }
}
