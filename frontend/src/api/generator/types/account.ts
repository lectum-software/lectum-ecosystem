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

export type AccountOnboardingTipsResponse = {
  has_seen_community_post_tip: boolean;
  has_seen_discover_psychologists_tip: boolean;
  has_seen_psychologists_my_search_tip: boolean;
  has_seen_psychologist_whatsapp_tip: boolean;
  has_seen_psychologist_profile_video_tip: boolean;
  has_seen_psychologist_reply_tip: boolean;
  has_seen_psychologist_original_post_tip: boolean;
};

export type AccountOnboardingTipsPayload = Partial<AccountOnboardingTipsResponse>;

export type AccountEmailPayload = {
  current_password: string;
  email: string;
};

export type AccountPasswordPayload = {
  current_password: string;
  password: string;
  password_confirm: string;
};

export type AccountDeletePayload = {
  confirmation: string;
  current_password?: string;
};

export type AccountDeleteGoogleIntentPayload = {
  callback_url?: string;
};

export type AccountDeleteGoogleIntentResponse = {
  url: string;
};

export type GoogleLinkIntentResponse = {
  url: string;
};

export type AccountUserResponse = user;
