import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminPsychologistAccountCapabilities = {
  can_change_email: boolean;
  can_send_email_confirmation: boolean;
  can_send_password_reset: boolean;
  can_set_temporary_password: boolean;
  can_revoke_sessions: boolean;
};

export type AdminPsychologistAccountDTO = {
  active: boolean;
  capabilities: AdminPsychologistAccountCapabilities;
  confirmed: boolean;
  confirmed_at: Date | null;
  created_at: Date;
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

export type IAdminPsychologistAccountShowDTO = Request & {
  p: {
    id: string;
  };
};

export type IAdminPsychologistAccountChangeEmailDTO = Request & {
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

export type IAdminPsychologistAccountReasonDTO = Request & {
  admin?: admin;
  b: {
    reason: string;
  };
  p: {
    id: string;
  };
};

export type IAdminPsychologistAccountSetTemporaryPasswordDTO = Request & {
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

export type IAdminPsychologistAccountRevokeSessionsDTO = Request & {
  admin?: admin;
  b: {
    confirmation: string;
    reason: string;
  };
  p: {
    id: string;
  };
};
