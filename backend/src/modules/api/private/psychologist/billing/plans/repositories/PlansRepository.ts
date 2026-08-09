import prisma, { type ORM } from "@/infra/database/prisma";
import type { subscription_plan } from "@/interfaces/objects";
import type { IPlansRepository } from "./interfaces/IPlansRepository";

export class PlansRepository implements IPlansRepository {
  readonly repository: ORM["subscription_plan"];

  constructor() {
    this.repository = prisma.subscription_plan;
  }

  async index(): Promise<subscription_plan[]> {
    return this.repository.findMany({
      where: {
        active: true,
        deleted: false,
      },
      orderBy: [{ price_cents: "asc" }, { createdAt: "asc" }],
    });
  }
}
