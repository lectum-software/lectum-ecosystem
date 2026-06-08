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
  provider?: string | null;
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
