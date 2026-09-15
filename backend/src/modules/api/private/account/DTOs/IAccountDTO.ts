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

export type AccountDeleteGoogleIntentBody = {
  callback_url?: string;
};

export type AccountDeleteGoogleIntentResponse = {
  device_id: string;
  url: string;
};

export type AccountOnboardingTipsBody = {
  has_seen_community_post_tip?: boolean;
  has_seen_discover_psychologists_tip?: boolean;
  has_seen_psychologists_my_search_tip?: boolean;
  has_seen_psychologist_whatsapp_tip?: boolean;
  has_seen_psychologist_profile_video_tip?: boolean;
  has_seen_psychologist_reply_tip?: boolean;
  has_seen_psychologist_original_post_tip?: boolean;
};

export type AccountOnboardingTipsResponse = {
  has_seen_community_post_tip: boolean;
  has_seen_discover_psychologists_tip: boolean;
  has_seen_psychologists_my_search_tip: boolean;
  has_seen_psychologist_whatsapp_tip: boolean;
  has_seen_psychologist_profile_video_tip: boolean;
  has_seen_psychologist_reply_tip: boolean;
  has_seen_psychologist_original_post_tip: boolean;
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

export interface IAccountDeleteGoogleIntentDTO extends IAccountDTO {
  b: AccountDeleteGoogleIntentBody;
}

export interface IAccountOnboardingTipsDTO extends IAccountDTO {
  b: AccountOnboardingTipsBody;
}
