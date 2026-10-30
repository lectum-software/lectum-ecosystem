import prisma from "@/infra/database/prisma";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
} from "@/utils/subscription-entitlement";
import type { IPendingReviewDTO, PendingReviewsResponse } from "../DTOs/IPendingReviewDTO";
import { pendingReviewProfessionalsWhere } from "./pending-review-policy";

export class PendingReviewRepository {
  async index(data: IPendingReviewDTO): Promise<PendingReviewsResponse> {
    const page = Math.max(1, data.q.page ?? 1);
    const limit = Math.min(50, Math.max(1, data.q.limit ?? 20));
    const patient = await prisma.user.findFirst({
      where: { id: data.auth.id!, active: true, deleted: false, role: "paciente" },
      select: { id: true },
    });
    if (!patient) return { data: [], count: 0, page, pages: 0 };
    const where = pendingReviewProfessionalsWhere(patient.id);
    const [items, count] = await prisma.$transaction(
      [
        prisma.user.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            avatar: true,
            psychologist_profile: {
              select: {
                headline: true,
                professional_first_name: true,
                professional_last_name: true,
                cfp_verified_at: true,
                crp_status: true,
                subscriptions: {
                  where: activeProfessionalEntitlementWhere(),
                  select: { id: true, source: true },
                  take: 1,
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      data: items.map((item) => ({
        id: item.id,
        psychologist_id: item.id,
        name: buildProfessionalFullDisplayName({
          fallbackName: item.name,
          firstName: item.psychologist_profile?.professional_first_name,
          lastName: item.psychologist_profile?.professional_last_name,
        }),
        avatar: item.avatar,
        headline: item.psychologist_profile?.headline ?? null,
        verified: isVerifiedProfessionalEntitlement(item.psychologist_profile),
      })),
      count,
      page,
      pages: Math.ceil(count / limit),
    };
  }
}
