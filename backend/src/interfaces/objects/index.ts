export interface user_token {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  token?: string | null;
  device_id?: string | null;
  user?: user | null;
}

export interface user_background {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  type?: string | null;
  data?: unknown;
  device_id?: string | null;
  user?: user | null;
}

export interface phone_verification {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
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

export interface patient_profile {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  goal?: string | null;
  gender?: string | null;
  birthdate?: Date | null;
  phone?: string | null;
  bio?: string | null;
  onboarding_completed_at?: Date | null;
  user?: user | null;
}

export interface psychologist_profile {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  headline?: string | null;
  bio?: string | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  video_cover_url?: string | null;
  cpf?: string | null;
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

export interface professional_registry_check {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
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

export interface specialty {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_specialties?: psychologist_specialty[] | null;
}

export interface service {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_services?: psychologist_service[] | null;
}

export interface approach {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
  psychologist_approaches?: psychologist_approach[] | null;
}

export interface psychologist_specialty {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  psychologist_id?: string | null;
  specialty_id?: string | null;
  psychologist?: user | null;
  specialty?: specialty | null;
}

export interface psychologist_service {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  psychologist_id?: string | null;
  service_id?: string | null;
  psychologist?: user | null;
  service?: service | null;
}

export interface psychologist_approach {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  psychologist_id?: string | null;
  approach_id?: string | null;
  psychologist?: user | null;
  approach?: approach | null;
}

export interface psychologist_favorite {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  psychologist_id?: string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface psychologist_follow {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  psychologist_id?: string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface subscription_plan {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  slug?: "gratuito" | "profissional" | string | null;
  name?: string | null;
  price_cents?: number | null;
  interval?: string | null;
  features?: unknown;
  active?: boolean | null;
  subscriptions?: professional_subscription[] | null;
}

export interface professional_subscription {
  id?: string | null;
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

export interface contact_request {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  psychologist_id?: string | null;
  channel?: "whatsapp" | string | null;
  user?: user | null;
  psychologist?: user | null;
}

export interface professional_review {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
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

export interface community {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  category?: string | null;
  members_count?: number | null;
  posts?: community_post[] | null;
}

export interface community_suggestion {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  theme?: string | null;
  status?: "pendente" | "aprovada" | "rejeitada" | string | null;
  user?: user | null;
}

export interface community_post {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
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
}

export interface post_reply {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  post_id?: string | null;
  author_id?: string | null;
  parent_reply_id?: string | null;
  title?: string | null;
  content?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  upvotes_count?: number | null;
  post?: community_post | null;
  author?: user | null;
  parent_reply?: post_reply | null;
  replies?: post_reply[] | null;
  saves?: post_reply_save[] | null;
}

export interface post_save {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  post_id?: string | null;
  user?: user | null;
  post?: community_post | null;
}

export interface post_reply_save {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  reply_id?: string | null;
  user?: user | null;
  reply?: post_reply | null;
}

export interface notification_subscription {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  device_id?: string | null;
  user_id?: string | null;
  subscription?: unknown;
  user?: user | null;
}

export interface notification {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  read?: boolean | null;
  redirect?: string | null;
  message_key?: string | null;
  message_props?: unknown;
  user_id?: string | null;
  user?: user | null;
}

export interface notification_preference {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  prefs?: unknown;
  user?: user | null;
}

export interface user {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  avatar?: string | null;
  provider?: string | null;
  role?: string | null;
  email?: string | null;
  password?: string | null;
  password_confirm?: string | null;
  active?: boolean | null;
  need_reset?: boolean | null;
  confirmed?: boolean | null;
  confirmed_date?: Date | null;
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
  notification_subscriptions?: notification_subscription[] | null;
  notifications?: notification[] | null;
  notification_preference?: notification_preference | null;
}
