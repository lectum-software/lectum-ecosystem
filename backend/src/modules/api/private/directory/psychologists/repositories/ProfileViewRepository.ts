import prisma from "@/infra/database/prisma";
import { sanitizeAnalyticsPathWithTrafficQuery } from "@/utils/analytics-traffic-path";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryPsychologistProfileViewResponse,
  IProfileSearchImpressionDTO,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";

const PROFILE_VIEW_ANTI_SPAM_WINDOW_MS = 6 * 60 * 60 * 1000;
const PROFILE_PAGE_SOURCE = "profile_page";
const SEARCH_RESULT_SOURCE = "search_result";

const recentWindowStart = () => new Date(Date.now() - PROFILE_VIEW_ANTI_SPAM_WINDOW_MS);

const normalizeSearchResultPosition = (value: unknown) => {
  const position = Number(value);

  if (!Number.isFinite(position) || position <= 0) return null;

  return Math.min(10000, Math.floor(position));
};

export class ProfileViewRepository {
  private async findTrackablePsychologist(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
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
  }

  async track(data: IProfileShowDTO): Promise<DirectoryPsychologistProfileViewResponse | null> {
    const psychologist = await this.findTrackablePsychologist(data.p.id);

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
      source: PROFILE_PAGE_SOURCE,
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
        source: PROFILE_PAGE_SOURCE,
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

  async trackSearchResultImpression(
    data: IProfileSearchImpressionDTO,
  ): Promise<DirectoryPsychologistProfileViewResponse | null> {
    const psychologist = await this.findTrackablePsychologist(data.p.id);

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
    const searchContextPath = data.b?.path
      ? sanitizeAnalyticsPathWithTrafficQuery(data.b.path)
      : null;

    await prisma.profile_view_event.create({
      data: {
        device_id: deviceId ?? null,
        psychologist_id: psychologist.id,
        search_context_path: searchContextPath,
        search_result_position: normalizeSearchResultPosition(data.b?.position),
        source: SEARCH_RESULT_SOURCE,
        viewer_id: viewerId,
      },
      select: {
        id: true,
      },
    });

    return {
      notification_event_id: null,
      tracked: true,
    };
  }
}
