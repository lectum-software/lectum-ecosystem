import type { ProfessionalSubscription } from "./billing";

export type user_token = {
  token?: string;
  createdAt?: string;
};

export type patient_profile = {
  id?: string;
  user_id?: string;
  goal?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  onboarding_completed_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type psychologist_profile = {
  id?: string;
  user_id?: string;
  headline?: string | null;
  bio?: string | null;
  video_url?: string | null;
  cpf?: string | null;
  crp?: string | null;
  crp_status?: "pendente" | "em_analise" | "aprovado" | "rejeitado" | null;
  cfp_verified_at?: string | null;
  professional_address_street?: string | null;
  professional_address_number?: string | null;
  professional_address_complement?: string | null;
  professional_address_district?: string | null;
  professional_address_zip?: string | null;
  professional_address_city?: string | null;
  professional_address_state?: string | null;
  whatsapp?: string | null;
  whatsapp_verified_at?: string | null;
  languages?: unknown;
  modality?: "online" | "presencial" | "hibrido" | null;
  rating_avg?: number;
  rating_count?: number;
  published?: boolean;
  subscriptions?: ProfessionalSubscription[];
  createdAt?: string;
  updatedAt?: string;
};

export type user = {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: "paciente" | "psicologo" | null;
  active?: boolean;
  confirmed?: boolean;
  has_seen_discover_psychologists_tip?: boolean;
  has_seen_psychologists_my_search_tip?: boolean;
  has_seen_psychologist_whatsapp_tip?: boolean;
  has_seen_psychologist_profile_video_tip?: boolean;
  has_seen_psychologist_reply_tip?: boolean;
  has_seen_psychologist_original_post_tip?: boolean;
  has_seen_community_post_tip?: boolean;
  provider?: string | null;
  need_reset?: boolean | null;
  user_tokens?: user_token[];
  patient_profile?: patient_profile | null;
  psychologist_profile?: psychologist_profile | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PatientPrivateProfile = {
  user: Pick<user, "id" | "name" | "email" | "avatar" | "role" | "confirmed" | "provider"> & {
    patient_profile?: patient_profile | null;
  };
  profile: patient_profile;
};

export type PatientProfileAvatarUpload = {
  avatar_url: string;
  profile: PatientPrivateProfile;
};

export type PatientProfileAvatarRemoval = {
  profile: PatientPrivateProfile;
};
