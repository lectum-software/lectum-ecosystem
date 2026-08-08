import type {
  AdminPatientActivitiesQuery,
  AdminPatientReportsQuery,
  PatientsDashboardQuery,
} from "./types/account-reports";

export const cleanParams = (input: PatientsDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const cleanActivitiesParams = (input: AdminPatientActivitiesQuery) => ({
  ...(input.area ? { area: input.area } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type ? { type: input.type } : {}),
});

export const cleanReportsParams = (input: AdminPatientReportsQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.status && input.status !== "all" ? { status: input.status } : {}),
  ...(input.to ? { to: input.to } : {}),
  ...(input.type && input.type !== "all" ? { type: input.type } : {}),
});
