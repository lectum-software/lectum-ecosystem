import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type PatientsListSort = "name" | "recent";
export type PatientsListStatus = "active" | "inactive";
export type PatientsListProvider = "email_password" | "google";

export type PatientsListQuery = {
  gender?: string;
  limit?: number;
  page?: number;
  provider?: PatientsListProvider;
  q?: string;
  sort?: PatientsListSort;
  status?: PatientsListStatus;
};

export type PatientsListOption = {
  count: number;
  id: string;
  label: string;
};

export type PatientsListItem = {
  avatar: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  detail_url: string;
  email: string;
  gender: string | null;
  gender_label: string;
  id: string;
  last_location_at: string | null;
  name: string;
  onboarding_completed_at: string | null;
  provider: string;
  provider_label: string;
  state: string | null;
  status: PatientsListStatus;
  status_label: "Ativo" | "Inativo";
};

export type AdminPatientsList = {
  active_filters_count: number;
  count: number;
  data: PatientsListItem[];
  filters: {
    genders: PatientsListOption[];
    providers: PatientsListOption[];
    statuses: PatientsListOption[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: PatientsListSort;
  source: "user+patient_profile+visitor_location";
};

const cleanParams = (input: PatientsListQuery) => ({
  ...(input.gender ? { gender: input.gender } : {}),
  ...(input.limit ? { limit: input.limit } : {}),
  ...(input.page ? { page: input.page } : {}),
  ...(input.provider ? { provider: input.provider } : {}),
  ...(input.q ? { q: input.q } : {}),
  ...(input.sort ? { sort: input.sort } : {}),
  ...(input.status ? { status: input.status } : {}),
});

export const getAdminPatientsList = async (input: PatientsListQuery) => {
  const response = await adminApi.get<ApiResponse<AdminPatientsList>>(
    "/api/admin/private/patients",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};
