import type { user } from "./user";

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

export type AccountEmailPayload = {
  current_password: string;
  email: string;
};

export type AccountPasswordPayload = {
  current_password: string;
  password: string;
  password_confirm: string;
};

export type GoogleLinkIntentResponse = {
  url: string;
};

export type AccountUserResponse = user;
