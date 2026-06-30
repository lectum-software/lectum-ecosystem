import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryPsychologistProfileViewResponse,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";

const PROFILE_VIEW_ANTI_SPAM_WINDOW_MS = 6 * 60 * 60 * 1000;

const recentWindowStart = () => new Date(Date.now() - PROFILE_VIEW_ANTI_SPAM_WINDOW_MS);

export class ProfileViewRepository {
  async track(data: IProfileShowDTO): Promise<DirectoryPsychologistProfileViewResponse | null> {
    const psychologist = await prisma.user.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            published: true,
          },
        },
      },
      select: {
        id: true,
        psychologist_profile: {
          select: {
            subscriptions: {
              where: activeProfessionalEntitlementWhere(),
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!psychologist) return null;

    if (data.auth?.id === psychologist.id) {
      return {
        notification_event_id: null,
        tracked: false,
      };
    }

    const rawDevice = data.headers?.["x-device"];
    const deviceId = Array.isArray(rawDevice) ? rawDevice[0] : rawDevice;
    const viewerId = data.auth?.id ?? null;
    const recentWhere = {
      psychologist_id: psychologist.id,
      createdAt: {
        gte: recentWindowStart(),
      },
      deleted: false,
      ...(viewerId
        ? {
            viewer_id: viewerId,
          }
        : deviceId
          ? {
              device_id: deviceId,
            }
          : {}),
    };

    const recent = await prisma.profile_view_event.findFirst({
      where: recentWhere,
      select: {
        id: true,
      },
    });

    if (recent) {
      return {
        notification_event_id: null,
        tracked: false,
      };
    }

    const view = await prisma.profile_view_event.create({
      data: {
        device_id: deviceId ?? null,
        psychologist_id: psychologist.id,
        viewer_id: viewerId,
      },
      select: {
        id: true,
      },
    });

    const canNotify = Boolean(psychologist.psychologist_profile?.subscriptions.length);

    return {
      notification_event_id: canNotify ? view.id : null,
      tracked: true,
    };
  }
}
