import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminRegistryVerificationSource =
  | "admin_grant"
  | "api_automatica"
  | "manual_admin"
  | "pendente";

export type AdminRegistryVerificationStatus =
  | "api_indisponivel"
  | "aprovado"
  | "em_analise"
  | "limite_tentativas"
  | "pendente"
  | "rejeitado";

export type AdminRegistryVerificationActor = {
  email: string | null;
  id: string | null;
  name: string | null;
};

export type AdminPsychologistRegistryVerificationAttempt = {
  checked_at: Date;
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

export type AdminPsychologistRegistryVerificationDTO = {
  actions: {
    can_approve_manually: boolean;
    can_reject_manually: boolean;
    strong_approve_confirmation: "APROVAR CRP";
    strong_reject_confirmation: "REJEITAR CRP";
  };
  identity: {
    cpf: string | null;
    cpf_masked: string | null;
    crp: string | null;
    crp_registration_date: Date | null;
    experience_years: number | null;
    regional_crp: string | null;
    registration_number: string | null;
  };
  latest_attempts: AdminPsychologistRegistryVerificationAttempt[];
  source: "psychologist_profile+professional_registry_check";
  summary: {
    approval_label: "Ativo" | "Pendente";
    cfp_verified_at: Date | null;
    crp_status: string;
    latest_manual_admin: AdminRegistryVerificationActor | null;
    latest_manual_checked_at: Date | null;
    latest_manual_notes: string | null;
    latest_manual_reason: string | null;
    plan_label: "Cortesia" | "Gratuito" | "Profissional";
    plan_type: "cortesia" | "gratuito" | "profissional";
    source: AdminRegistryVerificationSource;
    source_label: string;
    status: AdminRegistryVerificationStatus;
    status_label: string;
  };
};

export type IAdminPsychologistRegistryVerificationShowDTO = Request & {
  p: {
    id: string;
  };
};

export type IAdminPsychologistRegistryVerificationApproveDTO = Request & {
  admin?: admin;
  auth?: admin;
  b: {
    confirmation: string;
    cpf: string;
    crp: string;
    crp_registration_date: string;
    notes: string;
    regional_crp: string;
    situation_confirmed: boolean;
  };
  p: {
    id: string;
  };
};

export type IAdminPsychologistRegistryVerificationUpdateIdentityDTO = Request & {
  admin?: admin;
  auth?: admin;
  b: {
    crp: string;
    crp_registration_date: string;
    regional_crp: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPsychologistRegistryVerificationRejectDTO = Request & {
  admin?: admin;
  auth?: admin;
  b: {
    confirmation: string;
    reason: string;
  };
  p: {
    id: string;
  };
};
