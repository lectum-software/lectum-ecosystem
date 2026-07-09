export type ApiResponse<T = unknown> = {
  status?: number;
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
};

export type AdminToken = {
  id?: string | null;
  admin_id?: string | null;
  token?: string | null;
  device_id?: string | null;
  createdAt?: string | null;
};

export type Admin = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  password?: string | null;
  password_confirm?: string | null;
  active?: boolean | null;
  confirmed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  admin_tokens?: AdminToken[] | null;
};

export type AdminLoginInput = {
  email: string;
  password: string;
};
