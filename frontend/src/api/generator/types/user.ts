export type user_token = {
  token?: string;
  createdAt?: string;
};

export type patient_profile = {
  id?: string;
  user_id?: string;
  goal?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  bio?: string | null;
  onboarding_completed_at?: string | null;
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
  createdAt?: string;
  updatedAt?: string;
};
