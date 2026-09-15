import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminPatientAccountCapabilities = {
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

export type AdminPatientAccountStatus = "active" | "deactivated" | "deleted" | "suspended";

export type AdminPatientAccountDTO = {
  active: boolean;
  account_status: AdminPatientAccountStatus;
  account_status_changed_at: Date | null;
  account_status_expires_at: Date | null;
  account_status_label: string;
  capabilities: AdminPatientAccountCapabilities;
  confirmed: boolean;
  confirmed_at: Date | null;
  created_at: Date;
  delete_blocked_reason: string | null;
  deleted: boolean;
  deleted_at: Date | null;
  email: string;
  has_password: boolean;
  last_access_at: Date | null;
  need_reset: boolean;
  provider: string;
  provider_label: string;
  sessions: {
    active_count: number;
    devices_count: number;
    last_access_at: Date | null;
    source: "user_token";
  };
  source: "user+user_token";
};

export type IAdminPatientAccountShowDTO = Request & {
  p: {
    id: string;
  };
};

export type IAdminPatientAccountChangeEmailDTO = Request & {
  admin?: admin;
  b: {
    confirmation: string;
    email: string;
    reason: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPatientAccountReasonDTO = Request & {
  admin?: admin;
  b: {
    reason: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPatientAccountSetTemporaryPasswordDTO = Request & {
  admin?: admin;
  b: {
    confirmation: string;
    password: string;
    password_confirm: string;
    reason: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPatientAccountRevokeSessionsDTO = Request & {
  admin?: admin;
  b: {
    confirmation: string;
    reason: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPatientAccountStatusActionDTO = Request & {
  admin?: admin;
  b: {
    confirmation: string;
    reason: string;
    suspension_duration_days?: number;
  };
  p: {
    id: string;
  };
};

export type AdminPatientAccountDeleteDTO = {
  deleted: true;
  id: string;
  source: "user+patient_profile+admin_activity_log";
};

export type AdminPatientAccountViewAsDTO = {
  mode: "admin_view_as";
  read_only: true;
  token: string;
  token_expires_in_seconds: number;
  target: {
    id: string;
    name: string;
    role: "paciente";
  };
  start_path: string;
  source: "user_token+admin_activity_log";
};
