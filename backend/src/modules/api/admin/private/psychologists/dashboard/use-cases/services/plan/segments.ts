import {
  type AdminPsychologistWhatsappTrafficOriginSourceId,
  isPaidProfessionalSubscription,
} from "@/utils/admin-psychologist-analytics";
import {
  isPlanHistoryKnownAt,
  professionalSubscriptionsAt,
} from "@/utils/professional-plan-history";
import type { AdminPsychologistsDashboardPlanSegment } from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistProfileRecord,
  AdminPsychologistSubscriptionRecord,
  AdminPsychologistWhatsappTrafficActionRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import { COURTESY_SUBSCRIPTION_SOURCE, FREE_PLAN_SLUG, STATUS_ACTIVE } from "../support/constants";

type PlanProfile = Pick<AdminPsychologistProfileRecord, "plan_history">;

export const profileCreatedUntil = (profile: AdminPsychologistProfileRecord, date: Date) =>
  profile.user.createdAt <= date;

const subscriptionActiveAt = (subscription: AdminPsychologistSubscriptionRecord, date: Date) => {
  if (subscription.status !== STATUS_ACTIVE) return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const isFreeSubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug === FREE_PLAN_SLUG;

export const isProfessionalPlan = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.plan.slug !== FREE_PLAN_SLUG;

export const isPaidGatewaySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  isPaidProfessionalSubscription(subscription);

const isCourtesySubscription = (subscription: AdminPsychologistSubscriptionRecord) =>
  subscription.source === COURTESY_SUBSCRIPTION_SOURCE && isProfessionalPlan(subscription);

export const activeSubscriptionsAt = (profile: PlanProfile, date: Date) =>
  professionalSubscriptionsAt(profile.plan_history, date).filter((subscription) =>
    subscriptionActiveAt(subscription, date),
  );

export const pickCurrentPlan = (profile: PlanProfile, date: Date) => {
  const active = activeSubscriptionsAt(profile, date);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftPaid = Number(isProfessionalPlan(left));
    const rightPaid = Number(isProfessionalPlan(right));
    if (leftPaid !== rightPaid) return rightPaid - leftPaid;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

export const hasActiveFreeAt = (profile: PlanProfile, date: Date) =>
  activeSubscriptionsAt(profile, date).some(isFreeSubscription);

export const getPlanSegmentAt = (
  profile: PlanProfile,
  date: Date,
): "courtesy" | "free" | "none" | "subscriber" | "unknown" => {
  if (!isPlanHistoryKnownAt(profile.plan_history, date)) return "unknown";
  const activeSubscriptions = activeSubscriptionsAt(profile, date);

  if (activeSubscriptions.some(isPaidGatewaySubscription)) return "subscriber";
  if (activeSubscriptions.some(isCourtesySubscription)) return "courtesy";
  if (activeSubscriptions.some(isFreeSubscription)) return "free";

  return "none";
};

export const hasActiveSubscriberAt = (profile: PlanProfile, date: Date) =>
  getPlanSegmentAt(profile, date) === "subscriber";

export const hasActiveCourtesyAt = (profile: PlanProfile, date: Date) =>
  getPlanSegmentAt(profile, date) === "courtesy";

export const hasCurrentFreePlanAt = (profile: PlanProfile, date: Date) =>
  getPlanSegmentAt(profile, date) === "free";

const profileMatchesPlanSegment = (
  profile: PlanProfile,
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) => {
  if (segment === "all") return true;
  if (segment === "free") return getPlanSegmentAt(profile, date) === "free";
  if (segment === "courtesy") return getPlanSegmentAt(profile, date) === "courtesy";

  return getPlanSegmentAt(profile, date) === "subscriber";
};

export const filterProfilesByPlanSegment = (
  profiles: AdminPsychologistProfileRecord[],
  date: Date,
  segment: AdminPsychologistsDashboardPlanSegment,
) =>
  segment === "all"
    ? profiles
    : profiles.filter((profile) => profileMatchesPlanSegment(profile, date, segment));

export const filterRecordsByUserPlanSegment = <T extends { user_id: string | null }>(
  records: T[],
  allowedUserIds: Set<string>,
) => records.filter((record) => record.user_id && allowedUserIds.has(record.user_id));

export const collectWhatsappTrafficTargetIds = (
  actions: AdminPsychologistWhatsappTrafficActionRecord[],
  targetTypes: Set<string>,
) => [
  ...new Set(
    actions.flatMap((action) =>
      action.target_id && action.target_type && targetTypes.has(action.target_type)
        ? [action.target_id]
        : [],
    ),
  ),
];

export type CommunityTrafficPlatformMetricSourceId = Extract<
  AdminPsychologistWhatsappTrafficOriginSourceId,
  "community_post_text" | "community_post_video" | "community_reply_text" | "community_reply_video"
>;
