import prisma, { type ORM } from "@/infra/database/prisma";

export class PostRepositoryContext {
  readonly repository: ORM["community_post"];

  constructor() {
    this.repository = prisma.community_post;
  }
}
