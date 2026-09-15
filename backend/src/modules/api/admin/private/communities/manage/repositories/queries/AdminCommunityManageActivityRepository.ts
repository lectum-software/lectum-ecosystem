import prisma from "@/infra/database/prisma";
import { adminCommunityActivitySelect } from "../support/manage-selects";

export class AdminCommunityManageActivityRepository {
  async listActivities(communityId: string) {
    return prisma.admin_activity_log.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminCommunityActivitySelect,
      where: {
        deleted: false,
        target_id: communityId,
        target_type: "community",
      },
    });
  }
}
