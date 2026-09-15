import type {
  AdminPsychologistActivitiesQuery,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistReportsQuery,
  AdminPsychologistReviewsQuery,
  AdminPsychologistStatisticsQuery,
} from "./types/content";
import type { PsychologistsDashboardQuery, PsychologistsListQuery } from "./types/dashboard-core";

export const cleanDashboardParams = (input: PsychologistsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const cleanListParams = (input: PsychologistsListQuery) => ({
  ...(input.accepts_insurance ? { accepts_insurance: input.accepts_insurance } : {}),
  ...(input.approach ? { approach: input.approach } : {}),
  ...(input.available_today ? { available_today: input.available_today } : {}),
  ...(input.city ? { city: input.city } : {}),
  ...(input.discount_first_session ? { discount_first_session: input.discount_first_session } : {}),
  ...(input.engagement ? { engagement: input.engagement } : {}),
  ...(input.experience ? { experience: input.experience } : {}),
  ...(input.gender ? { gender: input.gender } : {}),
  ...(input.language ? { language: input.language } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.modality ? { modality: input.modality } : {}),
  ...(input.more_experienced ? { more_experienced: input.more_experienced } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.plan ? { plan: input.plan } : {}),
  ...(input.profile_status ? { profile_status: input.profile_status } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.race_color ? { race_color: input.race_color } : {}),
  ...(input.registry_status ? { registry_status: input.registry_status } : {}),
  ...(input.religion ? { religion: input.religion } : {}),
  ...(input.service ? { service: input.service } : {}),
  ...(input.social_value ? { social_value: input.social_value } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.specialty ? { specialty: input.specialty } : {}),
  ...(input.state ? { state: input.state } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.target_audience ? { target_audience: input.target_audience } : {}),
  ...(input.profile_conversion ? { profile_conversion: input.profile_conversion } : {}),
  ...(input.profile_conversion_engagement
    ? { profile_conversion_engagement: input.profile_conversion_engagement }
    : {}),
  ...(input.verified ? { verified: input.verified } : {}),
});

export const cleanPublicationsParams = (input: AdminPsychologistPublicationsQuery) => ({
  ...(input.community ? { community: input.community } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

export const cleanStatisticsParams = (input: AdminPsychologistStatisticsQuery = {}) => ({
  ...(input.community ? { community: input.community } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const cleanReviewsParams = (input: AdminPsychologistReviewsQuery) => ({
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.rating ? { rating: input.rating } : {}),
  ...(input.status ? { status: input.status } : {}),
});

export const cleanReportsParams = (input: AdminPsychologistReportsQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

export const cleanActivitiesParams = (input: AdminPsychologistActivitiesQuery) => ({
  ...(input.area ? { area: input.area } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});
