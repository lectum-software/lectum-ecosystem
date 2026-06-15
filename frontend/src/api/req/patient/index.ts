import { callEndpoint } from "@/api/generator";
import type {
  PatientPrivateProfile,
  PatientProfileAvatarRemoval,
  PatientProfileAvatarUpload,
  PatientRelationListResponse,
  PatientRelationQuery,
  patient_profile,
} from "@/api/generator/types";
import { handleReq } from "@/api/handle";

export type PatientOnboardingGoal = "encontrar_psicologo" | "conhecer_comunidade";
export type PatientOnboardingGender =
  | "feminino"
  | "masculino"
  | "nao_binario"
  | "prefiro_nao_dizer";

export type CompletePatientOnboardingPayload = {
  name?: string;
  gender?: PatientOnboardingGender;
  goal?: PatientOnboardingGoal;
  birthdate?: string;
  phone?: string;
};

export type UpdatePatientProfilePayload = {
  name: string;
  gender?: PatientOnboardingGender | null;
  goal?: PatientOnboardingGoal | null;
  birthdate?: string | null;
  phone?: string | null;
  bio?: string | null;
};

export type FavoritePsychologistResponse = {
  psychologist_id: string;
  favorited: boolean;
};

export type FollowPsychologistResponse = {
  psychologist_id: string;
  followed: boolean;
};

export const getPatientProfile = async () => {
  const handle = callEndpoint({
    route: "/api/private/patient/profile",
  });

  return handleReq<patient_profile>(handle);
};

export const completePatientOnboarding = async (body: CompletePatientOnboardingPayload) => {
  const handle = callEndpoint({
    route: "/api/private/patient/onboarding",
    method: "PUT",
    body,
  });

  return handleReq<patient_profile>({
    ...handle,
    hideError: true,
  });
};

export const updatePatientProfile = async (body: UpdatePatientProfilePayload) => {
  const handle = callEndpoint({
    route: "/api/private/patient/profile",
    method: "PUT",
    body,
  });

  return handleReq<PatientPrivateProfile>({
    ...handle,
    showSuccess: true,
  });
};

export const uploadPatientProfileAvatar = async (file: File) => {
  const body = new FormData();
  body.append("avatar", file);

  const handle = callEndpoint({
    route: "/api/private/patient/profile/avatar",
    method: "POST",
    body,
  });

  return handleReq<PatientProfileAvatarUpload>({
    ...handle,
    showSuccess: true,
  });
};

export const deletePatientProfileAvatar = async () => {
  const handle = callEndpoint({
    route: "/api/private/patient/profile/avatar",
    method: "DELETE",
  });

  return handleReq<PatientProfileAvatarRemoval>({
    ...handle,
    showSuccess: true,
  });
};

export const getFavoritePsychologists = async (query: PatientRelationQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/user/favorites",
    query,
  });

  return handleReq<PatientRelationListResponse>(handle);
};

export const favoritePsychologist = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/user/favorites/:id",
    method: "POST",
    params: { id },
  });

  return handleReq<FavoritePsychologistResponse>(handle);
};

export const unfavoritePsychologist = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/user/favorites/:id",
    method: "DELETE",
    params: { id },
  });

  return handleReq<FavoritePsychologistResponse>(handle);
};

export const getFollowedPsychologists = async (query: PatientRelationQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/patient/follows",
    query,
  });

  return handleReq<PatientRelationListResponse>(handle);
};

export const followPsychologist = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/patient/follows/:id",
    method: "POST",
    params: { id },
  });

  return handleReq<FollowPsychologistResponse>({
    ...handle,
    showSuccess: true,
  });
};

export const unfollowPsychologist = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/patient/follows/:id",
    method: "DELETE",
    params: { id },
  });

  return handleReq<FollowPsychologistResponse>({
    ...handle,
    showSuccess: true,
  });
};
