import type { AdminPublicSource } from "@/api/public-response";
export type PatientsDashboardQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type PatientsDetailQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPatientUpdatePersonalDataInput = {
  display_name?: string;
  gender?: string | null;
  reason: string;
};

export type AdminPatientAccount = {
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
    source: AdminPublicSource<"user_token">;
  };
  source: AdminPublicSource<"user+user_token">;
};

export type AdminPatientAccountReasonInput = {
  reason: string;
};

export type AdminPatientChangeEmailInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  email: string;
};

export type AdminPatientSetTemporaryPasswordInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  password: string;
  password_confirm: string;
};

export type AdminPatientRevokeSessionsInput = AdminPatientAccountReasonInput & {
  confirmation: string;
};

export type AdminPatientAccountStatusActionInput = AdminPatientAccountReasonInput & {
  confirmation: string;
  suspension_duration_days?: number;
};

export type AdminPatientAccountDeleteResponse = {
  deleted: true;
  id: string;
  source: AdminPublicSource<"user+patient_profile+admin_activity_log">;
};

export type AdminPatientAccountViewAsResponse = {
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
  source: AdminPublicSource<"user_token+admin_activity_log">;
};

export type AdminPatientActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPatientReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPatientReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPatientReportsStatusGroup;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPatientReportItem = {
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
    };
    available: boolean;
    body: string;
    community: {
      id: string;
      name: string;
      slug: string;
    };
    created_at: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    public_url: string | null;
    title: string;
    type: "post" | "reply";
    unavailable_reason: string | null;
  };
  capabilities: {
    can_review_resolution: boolean;
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  created_at: string;
  description: string | null;
  id: string;
  moderation: {
    status: string;
    status_label: string;
  };
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    name: string;
    role: string;
  };
  status: string;
  status_group: AdminPatientReportsStatusGroup;
  status_label: string;
};

export type AdminPatientReports = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: AdminPublicSource<"post_report">;
    value: number;
  }[];
  count: number;
  data: AdminPatientReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | AdminPatientReportsStatusGroup;
      label: string;
    }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    days: number | null;
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: AdminPublicSource<"user+post_report+community_post+post_reply">;
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPatientActivityItem = {
  actor: {
    id: string;
    name: string;
    role: string;
  } | null;
  area: {
    id: string;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: string;
  type: {
    id: string;
    label: string;
  };
};

export type AdminPatientActivities = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPatientActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: {
      count: number;
      id: string;
      label: string;
    }[];
    types: {
      count: number;
      id: string;
      label: string;
    }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: AdminPublicSource<"user+patient_profile+community_member+community_post+post_reply+post_vote+post_save+post_reply_save+professional_review+admin_activity_log">;
  unavailable: {
    description: string;
    id: string;
    label: string;
    source: string;
  }[];
};
