import prisma from "@/infra/database/prisma";

export class PostShareArtifactRepository {
  async listExpired(now: Date, limit: number) {
    return prisma.post_share_artifact.findMany({
      where: {
        deleted: false,
        expires_at: {
          lte: now,
        },
      },
      orderBy: [{ expires_at: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        storage_key: true,
      },
      take: limit,
    });
  }

  async markDeleted(id: string, now: Date) {
    await prisma.post_share_artifact.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: now,
      },
    });
  }
}
