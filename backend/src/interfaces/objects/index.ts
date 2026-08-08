export interface PersistedObject {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
}

export interface user_token extends PersistedObject {
  user_id?: string | null;
  token?: string | null;
  device_id?: string | null;
  user?: user | null;
}

export interface admin_token extends PersistedObject {
  admin_id?: string | null;
  token?: string | null;
  device_id?: string | null;
  admin?: admin | null;
}

export interface admin extends PersistedObject {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  password_confirm?: string | null;
  active?: boolean | null;
  confirmed?: boolean | null;
  confirmed_date?: Date | null;
  confirm_code?: string | null;
  confirm_date?: Date | null;
  recovery_code?: string | null;
  recovery_date?: Date | null;
  need_reset?: boolean | null;
  admin_tokens?: admin_token[] | null;
  activity_logs?: admin_activity_log[] | null;
}

export interface admin_activity_log extends PersistedObject {
  admin_id?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  domain?: string | null;
  action?: string | null;
  source?: string | null;
  area?: string | null;
  changed_fields?: unknown;
  safe_before?: unknown;
  safe_after?: unknown;
  reason?: string | null;
  metadata?: unknown;
  admin?: admin | null;
}

export interface user_background extends PersistedObject {
  user_id?: string | null;
  type?: string | null;
  data?: unknown;
  device_id?: string | null;
  user?: user | null;
}

export interface phone_verification extends PersistedObject {
  user_id?: string | null;
  phone?: string | null;
  purpose?: "psychologist_whatsapp" | string | null;
  provider?: "twilio" | string | null;
  provider_message_id?: string | null;
  code_hash?: string | null;
  expires_at?: Date | null;
  attempts?: number | null;
  sent_at?: Date | null;
  verified_at?: Date | null;
  user?: user | null;
}

export interface patient_profile extends PersistedObject {
  user_id?: string | null;
  goal?: string | null;
  gender?: string | null;
  birthdate?: Date | null;
  phone?: string | null;
  bio?: string | null;
  onboarding_completed_at?: Date | null;
  user?: user | null;
}

export interface psychologist_profile extends PersistedObject {
  user_id?: string | null;
  professional_first_name?: string | null;
  professional_last_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  video_cover_url?: string | null;
  cpf?: string | null;
  birthdate?: Date | null;
  crp?: string | null;
  crp_registration_date?: Date | null;
  gender?: string | null;
  race_color?: string | null;
  religion?: string | null;
  target_audience?: unknown;
  discount_first_session?: boolean | null;
  social_value?: boolean | null;
  accepts_insurance?: boolean | null;
  show_experience_tag?: boolean | null;
  academic_title?: string | null;
  academic_institution?: string | null;
  academic_graduation_year?: string | null;
  academic_formations?: unknown;
  available_days?: unknown;
  professional_address_street?: string | null;
  professional_address_number?: string | null;
  professional_address_complement?: string | null;
  professional_address_district?: string | null;
  professional_address_zip?: string | null;
  professional_address_city?: string | null;
  professional_address_state?: string | null;
  crp_status?: string | null;
  cfp_verified_at?: Date | null;
  whatsapp?: string | null;
  whatsapp_verified_at?: Date | null;
  languages?: unknown;
  modality?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  published?: boolean | null;
  user?: user | null;
  subscriptions?: professional_subscription[] | null;
  registry_checks?: professional_registry_check[] | null;
}

export interface professional_registry_check extends PersistedObject {
  psychologist_id?: string | null;
  provider?: string | null;
  cpf?: string | null;
  registro?: string | null;
  uf?: string | null;
  found?: boolean | null;
  raw?: unknown;
  checked_at?: Date | null;
  psychologist?: psychologist_profile | null;
}

export interface specialty extends PersistedObject {
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_specialties?: psychologist_specialty[] | null;
}

export interface service extends PersistedObject {
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_services?: psychologist_service[] | null;
}

export interface approach extends PersistedObject {
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_approaches?: psychologist_approach[] | null;
}

export interface psychologist_specialty extends PersistedObject {
  psychologist_id?: string | null;
  specialty_id?: string | null;
  psychologist?: user | null;
  specialty?: specialty | null;
}

export interface psychologist_service extends PersistedObject {
  psychologist_id?: string | null;
  service_id?: string | null;
  psychologist?: user | null;
  service?: service | null;
}

export interface psychologist_approach extends PersistedObject {
  psychologist_id?: string | null;
  approach_id?: string | null;
  psychologist?: user | null;
  approach?: approach | null;
}

export interface psychologist_favorite extends PersistedObject {
  user_id?: string | null;
  psychologist_id?: string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface psychologist_follow extends PersistedObject {
  user_id?: string | null;
  psychologist_id?: string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface subscription_plan extends PersistedObject {
  slug?: "gratuito" | "profissional" | string | null;
  name?: string | null;
  price_cents?: number | null;
  interval?: string | null;
  features?: unknown;
  active?: boolean | null;
  gateway_plan_id?: string | null;
  subscriptions?: professional_subscription[] | null;
}

export interface professional_subscription extends PersistedObject {
  id?: string | null;
  internal_id?: number | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  psychologist_id?: string | null;
  plan_id?: string | null;
  status?: "inativa" | "ativa" | "inadimplente" | "cancelada" | string | null;
  source?: "free_signup" | "mercadopago" | "admin_grant" | "legacy" | string | null;
  gateway?: string | null;
  gateway_subscription_id?: string | null;
  current_period_end?: Date | null;
  grant_reason?: string | null;
  grant_notes?: string | null;
  granted_by?: string | null;
  grant_started_at?: Date | null;
  psychologist?: psychologist_profile | null;
  plan?: subscription_plan | null;
}

export interface billing_address extends PersistedObject {
  user_id?: string | null;
  zip?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  user?: user | null;
}

export interface payment_event extends PersistedObject {
  id?: string | null;
  internal_id?: number | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  gateway?: string | null;
  external_id?: string | null;
  type?: string | null;
  payload?: unknown;
}

export interface payment_method extends PersistedObject {
  user_id?: string | null;
  gateway?: string | null;
  gateway_token?: string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  user?: user | null;
}

export interface contact_request extends PersistedObject {
  user_id?: string | null;
  psychologist_id?: string | null;
  channel?: "whatsapp" | string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface professional_review extends PersistedObject {
  psychologist_id?: string | null;
  author_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  response?: string | null;
  responded_at?: Date | null;
  status?: "publicada" | "oculta" | string | null;
  psychologist?: user | null;
  author?: user | null;
}

export interface community extends PersistedObject {
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  deactivatedAt?: Date | null;
  description?: string | null;
  category?: string | null;
  members_count?: number | null;
  avatar_url?: string | null;
  visual_primary_color?: string | null;
  visual_primary_dark_color?: string | null;
  visual_soft_color?: string | null;
  visual_text_color?: string | null;
  visual_gradient_color?: string | null;
  posts?: community_post[] | null;
  rules?: community_rule[] | null;
}

export interface community_rule extends PersistedObject {
  community_id?: string | null;
  title?: string | null;
  description?: string | null;
  position?: number | null;
  active?: boolean | null;
  community?: community | null;
}

export interface community_suggestion extends PersistedObject {
  user_id?: string | null;
  theme?: string | null;
  status?: "pendente" | "aprovada" | "rejeitada" | string | null;
  user?: user | null;
}

export interface community_post extends PersistedObject {
  community_id?: string | null;
  author_id?: string | null;
  title?: string | null;
  content?: string | null;
  status?: "publicado" | "pendente" | "removido" | string | null;
  upvotes_count?: number | null;
  downvotes_count?: number | null;
  replies_count?: number | null;
  saves_count?: number | null;
  community?: community | null;
  author?: user | null;
  notification_mutes?: post_notification_mute[] | null;
  reports?: post_report[] | null;
}

export interface post_reply extends PersistedObject {
  post_id?: string | null;
  author_id?: string | null;
  parent_reply_id?: string | null;
  title?: string | null;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  upvotes_count?: number | null;
  downvotes_count?: number | null;
  post?: community_post | null;
  author?: user | null;
  parent_reply?: post_reply | null;
  replies?: post_reply[] | null;
  saves?: post_reply_save[] | null;
  reports?: post_report[] | null;
}

export interface post_save extends PersistedObject {
  user_id?: string | null;
  post_id?: string | null;
  user?: user | null;
  post?: community_post | null;
}

export interface post_reply_save extends PersistedObject {
  user_id?: string | null;
  reply_id?: string | null;
  user?: user | null;
  reply?: post_reply | null;
}

export interface post_notification_mute extends PersistedObject {
  user_id?: string | null;
  post_id?: string | null;
  user?: user | null;
  post?: community_post | null;
}

export interface post_report extends PersistedObject {
  post_id?: string | null;
  reply_id?: string | null;
  target_type?: "post" | "reply" | string | null;
  target_id?: string | null;
  reporter_id?: string | null;
  reason?: string | null;
  description?: string | null;
  status?: "pendente" | "em_analise" | "resolvida" | "rejeitada" | string | null;
  post?: community_post | null;
  reply?: post_reply | null;
  reporter?: user | null;
}

export interface notification_subscription extends PersistedObject {
  device_id?: string | null;
  user_id?: string | null;
  subscription?: unknown;
  user?: user | null;
}

export interface visitor_location extends PersistedObject {
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source?: string | null;
  confidence?: number | null;
  provider?: string | null;
  user?: user | null;
}

export interface visitor_session extends PersistedObject {
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  device_type?: "mobile" | "tablet" | "desktop" | "unknown" | string | null;
  os?: string | null;
  browser?: string | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  first_seen_at?: Date | null;
  last_seen_at?: Date | null;
  user?: user | null;
}

export interface page_view_event extends PersistedObject {
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  path?: string | null;
  normalized_path?: string | null;
  title?: string | null;
  referrer_host?: string | null;
  traffic_source?: string | null;
  traffic_medium?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  page_kind?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  display_mode?: "browser" | "standalone" | "fullscreen" | "minimal-ui" | "unknown" | string | null;
  is_entry?: boolean | null;
  entry_path?: string | null;
  duration_seconds?: number | null;
  occurred_at?: Date | null;
  user?: user | null;
}

export interface important_action_event extends PersistedObject {
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  action_type?: string | null;
  path?: string | null;
  page_kind?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  display_mode?: "browser" | "standalone" | "fullscreen" | "minimal-ui" | "unknown" | string | null;
  occurred_at?: Date | null;
  user?: user | null;
}

export interface notification extends PersistedObject {
  read?: boolean | null;
  redirect?: string | null;
  message_key?: string | null;
  message_props?: unknown;
  user_id?: string | null;
  user?: user | null;
  actor?: notification_actor | null;
}

export interface notification_preference extends PersistedObject {
  user_id?: string | null;
  prefs?: unknown;
  user?: user | null;
}

export interface user extends PersistedObject {
  name?: string | null;
  avatar?: string | null;
  provider?: string | null;
  role?: string | null;
  email?: string | null;
  password?: string | null;
  password_confirm?: string | null;
  active?: boolean | null;
  account_status?: "active" | "suspended" | "deactivated" | "deleted" | string | null;
  account_status_changed_at?: Date | null;
  account_status_expires_at?: Date | null;
  need_reset?: boolean | null;
  confirmed?: boolean | null;
  confirmed_date?: Date | null;
  has_seen_discover_psychologists_tip?: boolean | null;
  has_seen_psychologists_my_search_tip?: boolean | null;
  has_seen_psychologist_whatsapp_tip?: boolean | null;
  has_seen_psychologist_profile_video_tip?: boolean | null;
  has_seen_psychologist_reply_tip?: boolean | null;
  has_seen_psychologist_original_post_tip?: boolean | null;
  has_seen_community_post_tip?: boolean | null;
  recovery_code?: string | null;
  recovery_date?: Date | null;
  confirm_code?: string | null;
  confirm_date?: Date | null;
  user_tokens?: user_token[] | null;
  user_backgrounds?: user_background[] | null;
  phone_verifications?: phone_verification[] | null;
  patient_profile?: patient_profile | null;
  psychologist_profile?: psychologist_profile | null;
  psychologist_specialties?: psychologist_specialty[] | null;
  psychologist_services?: psychologist_service[] | null;
  psychologist_approaches?: psychologist_approach[] | null;
  favorite_psychologists?: psychologist_favorite[] | null;
  favorited_by_patients?: psychologist_favorite[] | null;
  followed_psychologists?: psychologist_follow[] | null;
  followed_by_patients?: psychologist_follow[] | null;
  contact_requests?: contact_request[] | null;
  received_contact_requests?: contact_request[] | null;
  professional_reviews?: professional_review[] | null;
  received_reviews?: professional_review[] | null;
  community_suggestions?: community_suggestion[] | null;
  community_posts?: community_post[] | null;
  post_replies?: post_reply[] | null;
  post_saves?: post_save[] | null;
  post_reply_saves?: post_reply_save[] | null;
  post_notification_mutes?: post_notification_mute[] | null;
  post_reports?: post_report[] | null;
  notification_subscriptions?: notification_subscription[] | null;
  visitor_locations?: visitor_location[] | null;
  visitor_sessions?: visitor_session[] | null;
  page_view_events?: page_view_event[] | null;
  important_action_events?: important_action_event[] | null;
  billing_addresses?: billing_address[] | null;
  payment_methods?: payment_method[] | null;
  notifications?: notification[] | null;
  notification_preference?: notification_preference | null;
}

export interface notification_actor extends PersistedObject {
  id?: string | null;
  name: string;
  avatar?: string | null;
  role?: string | null;
  professional_label?: string | null;
  verified?: boolean | null;
  anonymous?: boolean | null;
  deleted?: boolean | null;
}
