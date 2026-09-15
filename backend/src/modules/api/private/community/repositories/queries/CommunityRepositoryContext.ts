import prisma, { type ORM } from "@/infra/database/prisma";

export class CommunityRepositoryContext {
  readonly repository: ORM["community"];

  constructor() {
    this.repository = prisma.community;
  }
}
