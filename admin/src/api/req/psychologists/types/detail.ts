import type {
  AdminPsychologistRegistryVerificationSummary,
  AdminRegistryVerificationActor,
  AdminRegistryVerificationSource,
} from "./list";

export type AdminPsychologistDetailStatus = "free" | "pending" | "unpublished" | "verified";

export type AdminPsychologistCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type AdminPsychologistDetailMetric = {
  id: string;
  label: string;
  source: string;
  unit: "count" | "decimal" | "position";
  value: number | null;
};

export type AdminPsychologistDetailEvent = {
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  created_at: string;
  description: string;
  id: string;
  label: string;
  source: string;
  type: string;
};

export type AdminPsychologistIntegrationStatus = {
  checked_at: string | null;
  id: "email" | "mercado_pago" | "registry" | "subscription" | "whatsapp";
  label: string;
  source: string;
  status: "active" | "configured" | "missing" | "pending" | "synced" | "unavailable";
  status_label: string;
};

export type AdminPsychologistDetail = {
  general: {
    account_history: AdminPsychologistDetailEvent[];
    integrations: AdminPsychologistIntegrationStatus[];
    metrics: AdminPsychologistDetailMetric[];
    recent_activity: AdminPsychologistDetailEvent[];
    subscription: {
      current_period_end: string | null;
      gateway: string | null;
      gateway_label: string | null;
      id: string | null;
      interval: string | null;
      payment_method: {
        brand: string | null;
        exp_month: number | null;
        exp_year: number | null;
        gateway: string;
        last4: string | null;
      } | null;
      plan_name: string | null;
      plan_slug: string | null;
      price_cents: number | null;
      source: string | null;
      started_at: string | null;
      status: string | null;
      time_to_first_paid_subscription: {
        days: number | null;
        first_paid_subscription_at: string | null;
        label: string;
        registered_at: string | null;
        status: "converted" | "courtesy_only" | "free_only" | "not_converted" | "unavailable";
      };
    };
  };
  header: {
    active: boolean;
    avatar: string | null;
    created_at: string;
    crp: string | null;
    id: string;
    last_access_at: string | null;
    name: string;
    plan_name: string | null;
    plan_slug: string | null;
    public_profile_url: string;
    published: boolean;
    rating_avg: number;
    rating_count: number;
    status: AdminPsychologistDetailStatus;
    status_label: string;
    verified: boolean;
  };
  profile: {
    academic: {
      formations: string[];
      graduation_year: string | null;
      institution: string | null;
      title: string | null;
    };
    content: {
      bio: string | null;
      cover_image_url: string | null;
      headline: string | null;
      video_cover_url: string | null;
      video_url: string | null;
    };
    features: {
      accepts_insurance: boolean;
      discount_first_session: boolean;
      social_value: boolean;
    };
    personal: {
      address: {
        city: string | null;
        complement: string | null;
        district: string | null;
        full: string | null;
        number: string | null;
        state: string | null;
        street: string | null;
        zip: string | null;
      };
      birthdate: string | null;
      cpf: string | null;
      email: string;
      full_name: string;
      phone: string | null;
      provider: string;
    };
    professional: {
      approaches: AdminPsychologistCatalogItem[];
      crp: string | null;
      crp_registration_date: string | null;
      crp_status: string;
      experience_years: number | null;
      gender: string | null;
      languages: string[];
      modality: string | null;
      race_color: string | null;
      regional_crp: string | null;
      registration_number: string | null;
      religion: string | null;
      services: AdminPsychologistCatalogItem[];
      specialties: AdminPsychologistCatalogItem[];
      target_audience: string[];
    };
  };
  source: "user+psychologist_profile+catalogs+subscriptions+metrics+events";
};

export type AdminPsychologistUpdatePersonalDataInput = {
  address_city?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_number?: string | null;
  address_state?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  birthdate?: string | null;
  confirm_cpf_change?: boolean;
  cpf?: string | null;
  gender?: string | null;
  race_color?: string | null;
  reason: string;
  religion?: string | null;
  whatsapp?: string | null;
};

export type AdminPsychologistUpdateProfessionalDataInput = {
  approach_ids?: string[];
  languages?: string[];
  modality?: "hibrido" | "online" | "presencial" | null;
  reason: string;
  service_ids?: string[];
  specialty_ids?: string[];
  target_audience?: string[];
};

export type AdminPsychologistAccount = {
  active: boolean;
  account_status_expires_at: string | null;
  account_status: "active" | "deactivated" | "deleted" | "suspended";
  account_status_changed_at: string | null;
  account_status_label: string;
  capabilities: {
    can_change_email: boolean;
    can_deactivate_account: boolean;
    can_delete_account: boolean;
    can_send_email_confirmation: boolean;
    can_send_password_reset: boolean;
    can_set_temporary_password: boolean;
    can_suspend_account: boolean;
    can_revoke_sessions: boolean;
    can_view_as_user: boolean;
  };
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  delete_blocked_reason: string | null;
  deleted: boolean;
  deleted_at: string | null;
  email: string;
  has_password: boolean;
  last_access_at: string | null;
  need_reset: boolean;
  provider: string;
  provider_label: string;
  sessions: {
    active_count: number;
    devices_count: number;
    last_access_at: string | null;
    source: "user_token";
  };
  source: "user+user_token";
};

export type AdminPsychologistAccountReasonInput = {
  reason: string;
};

export type AdminPsychologistChangeEmailInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  email: string;
};

export type AdminPsychologistSetTemporaryPasswordInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  password: string;
  password_confirm: string;
};

export type AdminPsychologistRevokeSessionsInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
};

export type AdminPsychologistAccountStatusActionInput = AdminPsychologistAccountReasonInput & {
  confirmation: string;
  suspension_duration_days?: number;
};

export type AdminPsychologistAccountDeleteResponse = {
  deleted: true;
  id: string;
  source: "user+psychologist_profile+admin_activity_log";
};

export type AdminPsychologistAccountViewAsResponse = {
  mode: "admin_view_as";
  read_only: true;
  token: string;
  token_expires_in_seconds: number;
  target: {
    id: string;
    name: string;
    role: "psicologo";
  };
  start_path: string;
  source: "user_token+admin_activity_log";
};

export type AdminPsychologistBillingPaymentHistoryItem = {
  amount_cents: number | null;
  description: string;
  external_id: string;
  gateway: string;
  id: string;
  occurred_at: string | null;
  status: "cancelado" | "pago" | "pendente" | "processado" | "recusado";
  status_label: string;
  title: string;
};

export type AdminPsychologistBilling = {
  courtesy: {
    active_grant_id: string | null;
    blocked_reason: string | null;
    can_grant: boolean;
    can_revoke: boolean;
    cpf: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    period_options: { days: number; label: string }[];
    regional_crp: string | null;
    registration_number: string | null;
    requires_crp_registration_date: boolean;
  };
  payment_history: {
    available: boolean;
    items: AdminPsychologistBillingPaymentHistoryItem[];
    reason: string | null;
    source: "payment_event";
  };
  payment_method: {
    brand: string | null;
    exp_month: number | null;
    exp_year: number | null;
    gateway: string;
    last4: string | null;
  } | null;
  plan: {
    can_cancel: false;
    can_change_payment_method: false;
    current_period_end: string | null;
    gateway: string | null;
    gateway_label: string | null;
    grant_notes: string | null;
    grant_reason: string | null;
    grant_started_at: string | null;
    granted_by: string | null;
    has_external_billing: boolean;
    id: string | null;
    interval: string | null;
    is_courtesy: boolean;
    is_paid: boolean;
    lifetime_value_available: boolean;
    lifetime_value_cents: number | null;
    lifetime_value_unavailable_reason: string | null;
    paid_installments_count: number;
    plan_name: string | null;
    plan_slug: string | null;
    price_cents: number | null;
    source: string | null;
    source_label: string | null;
    started_at: string | null;
    status: string | null;
  };
  source: "professional_subscription+payment_method+payment_event+admin_grant_service";
};

export type AdminPsychologistGrantCourtesyInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes: string;
  period_days: number;
  regional_crp: string;
};

export type AdminPsychologistGrantCourtesyResponse = {
  billing: AdminPsychologistBilling;
  grant: {
    crp_registration_date: string | null;
    granted_to: {
      email: string;
      name: string;
      profileId: string;
      userId: string;
    };
    identity_override: {
      cpf: string | null;
      crp: string | null;
      crp_number: string | null;
      crp_region: string | null;
    } | null;
    subscription: {
      current_period_end: string;
      id: string;
      plan: {
        id: string;
        name: string;
        slug: string;
      };
      source: string;
      status: string;
    };
  };
};

export type AdminPsychologistRevokeCourtesyResponse = {
  billing: AdminPsychologistBilling;
  revoked: {
    id: string;
    status: "cancelada";
  };
};

export type AdminPsychologistRegistryVerificationAttempt = {
  checked_at: string;
  cpf_masked: string | null;
  found: boolean;
  id: string;
  notes: string | null;
  reason: string | null;
  regional_crp: string | null;
  registration_number: string | null;
  result_label: string;
  source: Exclude<AdminRegistryVerificationSource, "admin_grant" | "pendente">;
  source_label: string;
  responsible_admin: AdminRegistryVerificationActor | null;
};

export type AdminPsychologistRegistryVerification = {
  actions: {
    can_approve_manually: boolean;
    can_reject_manually: boolean;
    strong_approve_confirmation: "APROVAR CRP";
    strong_reject_confirmation: "REJEITAR CRP";
    strong_save_confirmation: "SALVAR REGISTRO";
  };
  identity: {
    cpf: string | null;
    cpf_masked: string | null;
    crp: string | null;
    crp_registration_date: string | null;
    experience_years: number | null;
    regional_crp: string | null;
    registration_number: string | null;
  };
  latest_attempts: AdminPsychologistRegistryVerificationAttempt[];
  source: "psychologist_profile+professional_registry_check";
  summary: AdminPsychologistRegistryVerificationSummary & {
    approval_label: "Ativo" | "Pendente";
    cfp_verified_at: string | null;
    crp_status: string;
    latest_manual_admin: AdminRegistryVerificationActor | null;
    latest_manual_checked_at: string | null;
    latest_manual_notes: string | null;
    latest_manual_reason: string | null;
    plan_label: "Cortesia" | "Gratuito" | "Profissional";
    plan_type: "cortesia" | "gratuito" | "profissional";
  };
};

export type AdminPsychologistApproveRegistryVerificationInput = {
  confirmation: string;
  cpf: string;
  crp: string;
  crp_registration_date: string;
  notes?: string | null;
  regional_crp: string;
  situation_confirmed: boolean;
};

export type AdminPsychologistRejectRegistryVerificationInput = {
  confirmation: string;
  reason: string;
};

export type AdminPsychologistUpdateRegistryIdentityInput = {
  confirmation: string;
  crp: string;
  crp_registration_date: string;
  regional_crp: string;
};
