import type { user } from "@/interfaces/objects";

export type AccountEmailBody = {
  current_password: string;
  email: string;
};

export type AccountPasswordBody = {
  current_password: string;
  password: string;
  password_confirm: string;
};

export type AccountDeleteBody = {
  confirmation: string;
  current_password?: string;
};

export type AccountGoogleSecurity = {
  available: boolean;
  blocked_reason?: string;
  can_link: boolean;
  can_unlink: boolean;
  connected: boolean;
  manage_url: string;
};

export type AccountSecurityResponse = {
  confirmed: boolean;
  email: string | null;
  google: AccountGoogleSecurity;
  has_password: boolean;
  provider: string | null;
};

export interface IAccountDTO {
  auth: user;
  device?: string;
  headers?: Record<string, unknown>;
}

export interface IAccountEmailDTO extends IAccountDTO {
  b: AccountEmailBody;
}

export interface IAccountPasswordDTO extends IAccountDTO {
  b: AccountPasswordBody;
}

export interface IAccountDeleteDTO extends IAccountDTO {
  b: AccountDeleteBody;
}
