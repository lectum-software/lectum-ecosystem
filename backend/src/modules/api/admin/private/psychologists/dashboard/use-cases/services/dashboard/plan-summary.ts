import {
  summarizePlatformUsage,
  summarizePsychologistWhatsappTrafficOrigins,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardPeriod,
  AdminPsychologistsDashboardPlanSegment,
  AdminPsychologistsDashboardPlanSegmentSummary,
  AdminPsychologistsDashboardPsychologist,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistAttentionRecord,
  AdminPsychologistCommunityTrafficPlatformDataset,
  AdminPsychologistContentAttentionRecord,
  AdminPsychologistEventRecord,
  AdminPsychologistPlatformPageViewRecord,
  AdminPsychologistPlatformPwaInstallRecord,
  AdminPsychologistPlatformSessionRecord,
  AdminPsychologistPreSignupConversionPageViewRecord,
  AdminPsychologistPreSignupConversionSessionRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistProfileTrafficPlatformDataset,
  AdminPsychologistReceivedEngagementEventRecord,
  AdminPsychologistSignupAnalyticsIdentityRecord,
  AdminPsychologistTrafficCommunityPostRecord,
  AdminPsychologistTrafficCommunityReplyRecord,
  AdminPsychologistWhatsappTrafficActionRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { buildProfileConversionBehaviorResults } from "../conversion-behavior/results";
import { buildProfileCrossMatrixResults } from "../cross-matrix/results";
import {
  filterProfilesByPlanSegment,
  filterRecordsByUserPlanSegment,
  hasActiveFreeAt,
  pickCurrentPlan,
} from "../plan/segments";
import {
  buildDeviceUsage,
  normalizeName,
  summarizePreSignupConversion,
} from "../pre-signup/conversion";
import {
  buildProfileActivityResults,
  buildProfileConversionActivityMatrixResults,
  buildProfileCoverageResults,
} from "../profile/activity";
import {
  buildProfileConversionGoalResults,
  buildProfileConversionResults,
} from "../profile/conversion";
import { buildProfileConversionEngagementResults } from "../profile/conversion-engagement";
import { buildProfileEngagementFavoritesResults } from "../profile/engagement-favorites";
import { buildProfileExposureResults } from "../profile/exposure";
import { buildProfileConversionEngagementFavoritesMatrixResults } from "../profile/favorites-matrix";
import { buildProfileConversionVisibilityMatrixResults } from "../profile/visibility-matrix";
import { hasVerifiedEntitlementAt } from "../subscriptions/timeline";
import { PLAN_SEGMENT_OPTIONS } from "../support/constants";
import { filterCommunityTrafficPlatformMetricDataset } from "../traffic/community";
import { buildTrafficPlatformMetrics } from "../traffic/presentation-video";
import { filterProfileTrafficPlatformMetricDataset } from "../traffic/profile";
import { buildSignupMethod, buildStatistics } from "./statistics";

export const buildPlanSegmentSummaries = (params: {
  communityTrafficPlatformMetricDataset: AdminPsychologistCommunityTrafficPlatformDataset;
  communityContentAttentionSeconds: AdminPsychologistContentAttentionRecord[];
  currentNewSignups: AdminPsychologistProfileRecord[];
  currentProfiles: AdminPsychologistProfileRecord[];
  date: Date;
  labels: string[];
  platformPageViews: AdminPsychologistPlatformPageViewRecord[];
  platformPwaInstalls: AdminPsychologistPlatformPwaInstallRecord[];
  platformSessions: AdminPsychologistPlatformSessionRecord[];
  period: AdminPsychologistsDashboardPeriod;
  preSignupConversionLinkedPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  preSignupConversionLinkedSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  preSignupConversionPageViews: AdminPsychologistPreSignupConversionPageViewRecord[];
  preSignupConversionSessions: AdminPsychologistPreSignupConversionSessionRecord[];
  preSignupConversionSignupIdentities: AdminPsychologistSignupAnalyticsIdentityRecord[];
  profileAttentionSeconds: AdminPsychologistAttentionRecord[];
  profileTrafficPlatformMetricDataset: AdminPsychologistProfileTrafficPlatformDataset;
  profileVideoAttentionSeconds: AdminPsychologistAttentionRecord[];
  profiles: AdminPsychologistProfileRecord[];
  publishedReviews: AdminPsychologistEventRecord[];
  rankingPositionsByPsychologistId: Map<string, number>;
  range: AdminPsychologistsDashboardDateRange;
  receivedEngagementEvents: AdminPsychologistReceivedEngagementEventRecord[];
  trafficCommunityPosts: AdminPsychologistTrafficCommunityPostRecord[];
  trafficCommunityReplies: AdminPsychologistTrafficCommunityReplyRecord[];
  whatsappTrafficActions: AdminPsychologistWhatsappTrafficActionRecord[];
  whatsappContactRequests: AdminPsychologistEventRecord[];
}) =>
  PLAN_SEGMENT_OPTIONS.reduce(
    (accumulator, segment) => {
      const segmentProfiles = filterProfilesByPlanSegment(
        params.currentProfiles,
        params.date,
        segment.id,
      );
      const segmentProfilesForSupply = filterProfilesByPlanSegment(
        params.profiles,
        params.date,
        segment.id,
      );
      const segmentNewSignups = filterProfilesByPlanSegment(
        params.currentNewSignups,
        params.date,
        segment.id,
      );
      const segmentUserIds = new Set(segmentProfiles.map((profile) => profile.user.id));
      const isAll = segment.id === "all";
      const platformPageViews = isAll
        ? params.platformPageViews
        : filterRecordsByUserPlanSegment(params.platformPageViews, segmentUserIds);
      const platformSessions = isAll
        ? params.platformSessions
        : filterRecordsByUserPlanSegment(params.platformSessions, segmentUserIds);
      const platformPwaInstalls = isAll
        ? params.platformPwaInstalls
        : filterRecordsByUserPlanSegment(params.platformPwaInstalls, segmentUserIds);
      const platformUsage = summarizePlatformUsage({
        eligiblePsychologistsCount: segmentProfiles.length,
        labels: params.labels,
        pageViews: platformPageViews,
        pwaInstalledUserIds: platformPwaInstalls.flatMap((event) =>
          event.user_id ? [event.user_id] : [],
        ),
      });
      const trafficPlatformMetrics = buildTrafficPlatformMetrics({
        communityDataset: isAll
          ? params.communityTrafficPlatformMetricDataset
          : filterCommunityTrafficPlatformMetricDataset(
              params.communityTrafficPlatformMetricDataset,
              segmentUserIds,
            ),
        profileDataset: isAll
          ? params.profileTrafficPlatformMetricDataset
          : filterProfileTrafficPlatformMetricDataset(
              params.profileTrafficPlatformMetricDataset,
              segmentUserIds,
            ),
        profiles: segmentProfiles,
      });
      const trafficSources = summarizePsychologistWhatsappTrafficOrigins({
        actions: params.whatsappTrafficActions,
        allowedPsychologistIds: isAll ? null : segmentUserIds,
        communityPlatformMetrics: trafficPlatformMetrics.metrics,
        platformMetricsConsideredCounts: trafficPlatformMetrics.consideredCounts,
        communityPosts: params.trafficCommunityPosts,
        communityReplies: params.trafficCommunityReplies,
      });

      accumulator[segment.id] = {
        device_usage: buildDeviceUsage(platformSessions),
        id: segment.id,
        label: segment.label,
        platform_usage: {
          ...platformUsage,
          eligible_psychologists_count: segmentProfiles.length,
          source: "page_view_event+important_action_event" as const,
        },
        pre_signup_conversion: summarizePreSignupConversion({
          linkedPageViews: params.preSignupConversionLinkedPageViews,
          linkedSessions: params.preSignupConversionLinkedSessions,
          pageViews: params.preSignupConversionPageViews,
          period: params.period,
          profiles: segmentNewSignups,
          sessions: params.preSignupConversionSessions,
          signupIdentities: params.preSignupConversionSignupIdentities,
        }),
        psychologists_count: segmentProfiles.length,
        signup_method: buildSignupMethod(segmentNewSignups),
        statistics: buildStatistics(segmentProfilesForSupply, params.date),
        profile_activity: buildProfileActivityResults({
          communityPosts: params.communityTrafficPlatformMetricDataset.posts,
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
        }),
        profile_coverage: buildProfileCoverageResults({
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
        }),
        profile_conversion_activity: buildProfileConversionActivityMatrixResults({
          communityPosts: params.communityTrafficPlatformMetricDataset.posts,
          communityReplies: params.communityTrafficPlatformMetricDataset.replies,
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_cross_matrix: buildProfileCrossMatrixResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          communityTrafficPlatformMetricDataset: params.communityTrafficPlatformMetricDataset,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileTrafficPlatformMetricDataset: params.profileTrafficPlatformMetricDataset,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          publishedReviews: params.publishedReviews,
          rankingPositionsByPsychologistId: params.rankingPositionsByPsychologistId,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_behavior: buildProfileConversionBehaviorResults({
          communityTrafficPlatformMetricDataset: params.communityTrafficPlatformMetricDataset,
          profileTrafficPlatformMetricDataset: params.profileTrafficPlatformMetricDataset,
          profiles: segmentProfiles,
          range: params.range,
          rankingPositionsByPsychologistId: params.rankingPositionsByPsychologistId,
          receivedEngagementEvents: params.receivedEngagementEvents,
          trafficCommunityPosts: params.trafficCommunityPosts,
          trafficCommunityReplies: params.trafficCommunityReplies,
          whatsappContactRequests: params.whatsappContactRequests,
          whatsappTrafficActions: params.whatsappTrafficActions,
        }),
        profile_conversion_goal: buildProfileConversionGoalResults({
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion: buildProfileConversionResults({
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_engagement_favorites: buildProfileEngagementFavoritesResults({
          profiles: segmentProfiles,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_engagement: buildProfileConversionEngagementResults({
          profiles: segmentProfiles,
          range: params.range,
          receivedEngagementEvents: params.receivedEngagementEvents,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_conversion_engagement_favorites:
          buildProfileConversionEngagementFavoritesMatrixResults({
            profiles: segmentProfiles,
            range: params.range,
            receivedEngagementEvents: params.receivedEngagementEvents,
            whatsappClicks: params.whatsappContactRequests,
          }),
        profile_conversion_visibility: buildProfileConversionVisibilityMatrixResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          range: params.range,
          whatsappClicks: params.whatsappContactRequests,
        }),
        profile_exposure: buildProfileExposureResults({
          communityContentAttentionSeconds: params.communityContentAttentionSeconds,
          profileAttentionSeconds: params.profileAttentionSeconds,
          profileVideoAttentionSeconds: params.profileVideoAttentionSeconds,
          profiles: segmentProfiles,
          range: params.range,
        }),
        traffic_sources: {
          ...trafficSources,
          source:
            "important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click" as const,
        },
      };

      return accumulator;
    },
    {} as Record<
      AdminPsychologistsDashboardPlanSegment,
      AdminPsychologistsDashboardPlanSegmentSummary
    >,
  );

const mapPsychologistStatus = (
  profile: AdminPsychologistProfileRecord,
  date: Date,
): AdminPsychologistsDashboardPsychologist["status"] => {
  if (hasVerifiedEntitlementAt(profile, date)) return "verificado";
  if (!profile.published) return "nao_publicado";
  if (hasActiveFreeAt(profile, date)) return "gratuito";

  return "pendente";
};

export const buildPsychologistsList = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
): AdminPsychologistsDashboardPsychologist[] =>
  profiles.slice(0, 5).map((profile) => {
    const plan = pickCurrentPlan(profile, date);

    return {
      avatar: profile.user.avatar,
      city: profile.professional_address_city,
      created_at: profile.user.createdAt,
      crp: profile.crp,
      email: profile.user.email,
      id: profile.user.id,
      name: normalizeName(profile.user.name),
      plan_name: plan?.plan.name ?? null,
      plan_slug: plan?.plan.slug ?? null,
      published: profile.published,
      state: profile.professional_address_state,
      status: mapPsychologistStatus(profile, date),
      verified: hasVerifiedEntitlementAt(profile, date),
    };
  });

export const roundRankingScore = (value: number) => Math.round(value * 1000) / 10;

export const getAllPeriodStartDate = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.reduce<Date | undefined>((earliest, profile) => {
    const createdAt = profile.user.createdAt;
    if (!earliest || createdAt < earliest) return createdAt;

    return earliest;
  }, undefined);
