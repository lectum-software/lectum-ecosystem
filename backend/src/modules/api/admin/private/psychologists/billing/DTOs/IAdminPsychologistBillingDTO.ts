import type { Request } from "express";
import type { admin } from "@/interfaces/objects";
import type { BillingPaymentHistoryItem } from "@/modules/api/private/psychologist/billing/subscription/repositories/interfaces/ISubscriptionRepository";

export type AdminPsychologistBillingPlan = {
  can_cancel: false;
  can_change_payment_method: false;
  current_period_end: Date | null;
  gateway: string | null;
  gateway_label: string | null;
  grant_notes: string | null;
  grant_reason: string | null;
  grant_started_at: Date | null;
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
  started_at: Date | null;
  status: string | null;
};

export type AdminPsychologistBillingPaymentMethod = {
  brand: string | null;
  exp_month: number | null;
  exp_year: number | null;
  gateway: string;
  last4: string | null;
} | null;

export type AdminPsychologistBillingPaymentHistory = {
  available: boolean;
  items: BillingPaymentHistoryItem[];
  reason: string | null;
  source: "payment_event";
};

export type AdminPsychologistBillingCourtesyPeriodOption = {
  days: number;
  label: string;
};

export type AdminPsychologistBillingCourtesy = {
  active_grant_id: string | null;
  blocked_reason: string | null;
  can_grant: boolean;
  can_revoke: boolean;
  cpf: string | null;
  crp: string | null;
  crp_registration_date: Date | null;
  period_options: AdminPsychologistBillingCourtesyPeriodOption[];
  regional_crp: string | null;
  registration_number: string | null;
  requires_crp_registration_date: boolean;
};

export type AdminPsychologistBillingDTO = {
  courtesy: AdminPsychologistBillingCourtesy;
  payment_history: AdminPsychologistBillingPaymentHistory;
  payment_method: AdminPsychologistBillingPaymentMethod;
  plan: AdminPsychologistBillingPlan;
  source: "professional_subscription+payment_method+payment_event+admin_grant_service";
};

export type AdminPsychologistBillingGrantBody = {
  confirmation: string;
  cpf?: string | null;
  crp?: string | null;
  crp_registration_date?: string | null;
  notes?: string | null;
  period_days: number;
  regional_crp?: string | null;
};

export type IAdminPsychologistBillingShowDTO = Request & {
  p: {
    id: string;
  };
  auth: admin;
  admin: admin;
};

export type IAdminPsychologistBillingGrantDTO = Request & {
  p: {
    id: string;
  };
  b: AdminPsychologistBillingGrantBody;
  auth: admin;
  admin: admin;
};

export type IAdminPsychologistBillingRevokeDTO = Request & {
  p: {
    id: string;
  };
  auth: admin;
  admin: admin;
};
