export type user_token = {
  token?: string;
  createdAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
};
