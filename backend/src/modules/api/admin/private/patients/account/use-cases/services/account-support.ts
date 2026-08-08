import { v4 } from "uuid";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { confirmEmailSend } from "@/modules/api/config/nodemailer/messages/confirm";
import { recoveryEmailSend } from "@/modules/api/config/nodemailer/messages/recovery";
import { isSuspensionExpired } from "@/utils/account-status";
import { isAdminViewAsDeviceId } from "@/utils/admin-view-as";
import { encrypt as encryptBcrypt } from "@/utils/crypt/bcrypt";
import type {
  AdminPatientAccountDTO,
  AdminPatientAccountStatus,
  IAdminPatientAccountShowDTO,
} from "../../DTOs/IAdminPatientAccountDTO";
import {
  type AdminPatientAccountAudit,
  type AdminPatientAccountRecord,
  AdminPatientAccountRepository,
} from "../../repositories/AdminPatientAccountRepository";

export const CHANGE_EMAIL_CONFIRMATION = "ALTERAR E-MAIL";

export const DEACTIVATE_ACCOUNT_CONFIRMATION = "DESATIVAR CONTA";

export const DELETE_ACCOUNT_CONFIRMATION = "EXCLUIR CONTA";

export const TEMP_PASSWORD_CONFIRMATION = "ALTERAR SENHA";

export const REVOKE_SESSIONS_CONFIRMATION = "ENCERRAR SESSÕES";

export const SUSPEND_ACCOUNT_CONFIRMATION = "SUSPENDER CONTA";

export const VIEW_AS_START_PATH = "/app/perfil";

export const normalizeStrongConfirmation = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, " ");

export const matchesStrongConfirmation = (value: string, expected: string) =>
  normalizeStrongConfirmation(value) === normalizeStrongConfirmation(expected);

export const ACCOUNT_STATUS_LABELS: Record<AdminPatientAccountStatus, string> = {
  active: "Ativa",
  deactivated: "Desativada",
  deleted: "Excluída",
  suspended: "Suspensa",
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const latestAccessAt = (tokens: AdminPatientAccountRecord["user"]["user_tokens"]) => {
  const token = tokens[0];
  if (!token) return null;

  return token.updatedAt > token.createdAt ? token.updatedAt : token.createdAt;
};

export const maskEmail = (value?: string | null) => {
  const email = normalizeEmail(value || "");
  const [local, domain] = email.split("@");
  if (!local || !domain) return email ? "E-mail informado" : null;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
};

export const providerLabel = (provider: string | null, hasPassword: boolean) => {
  if (provider === "google" && hasPassword) return "Google + senha local";
  if (provider === "google") return "Google";
  if (hasPassword) return "E-mail e senha";

  return provider || "Não informado";
};

export const hasTransactionalEmailConfig = () => {
  const values = [
    process.env.EMAIL_API_EMAIL,
    process.env.EMAIL_API_KEY,
    process.env.EMAIL_API_HOST,
    process.env.EMAIL_API_PORT,
    process.env.EMAIL_API_SENDER,
  ];

  return values.every((value) => Boolean(value?.trim()));
};

export const emailProviderUnavailable = () => ({
  status: 503,
  ...error("admin_patient_account_email_provider_unavailable", {}),
});

export const profileNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient_profile" }),
});

export const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

export const passwordSupportUnavailable = () => ({
  status: 403,
  ...error("admin_patient_account_password_support_unavailable", {}),
});

export const accountAlreadyDeleted = () => ({
  status: 410,
  ...error("admin_patient_account_already_deleted", {}),
});

export const invalidStatusTransition = () => ({
  status: 400,
  ...error("admin_patient_account_status_transition_invalid", {}),
});

export const invalidSuspensionDuration = () => ({
  status: 400,
  ...error("admin_patient_account_suspension_duration_invalid", {}),
});

export const viewAsUnavailable = () => ({
  status: 400,
  ...error("admin_patient_account_view_as_unavailable", {}),
});

export const normalizeAccountStatus = (
  user: AdminPatientAccountRecord["user"],
): AdminPatientAccountStatus => {
  if (user.deleted) return "deleted";

  const status = user.account_status;
  if (status === "active" || status === "suspended" || status === "deactivated") {
    return status;
  }

  return user.active ? "active" : "deactivated";
};

export const deleteBlockedReason = () => null;

export const buildAccountDto = (profile: AdminPatientAccountRecord): AdminPatientAccountDTO => {
  const user = profile.user;
  const hasPassword = Boolean(user.password);
  const activeTokens = user.user_tokens.filter((token) => !isAdminViewAsDeviceId(token.device_id));
  const deviceIds = new Set(activeTokens.map((token) => token.device_id).filter(Boolean));
  const lastAccess = latestAccessAt(activeTokens);
  const accountStatus = normalizeAccountStatus(user);
  const deleted = accountStatus === "deleted";
  const blockedReason = deleteBlockedReason();
  const canViewAsUser = !deleted && accountStatus === "active" && Boolean(user.active);

  return {
    active: Boolean(user.active),
    account_status: accountStatus,
    account_status_changed_at: user.account_status_changed_at,
    account_status_expires_at: user.account_status_expires_at,
    account_status_label: ACCOUNT_STATUS_LABELS[accountStatus],
    capabilities: {
      can_change_email: hasPassword && !deleted,
      can_deactivate_account: !deleted && accountStatus !== "deactivated",
      can_delete_account: !deleted && !blockedReason,
      can_send_email_confirmation: Boolean(user.email && !user.confirmed && !deleted),
      can_send_password_reset: hasPassword && !deleted,
      can_set_temporary_password: hasPassword && !deleted,
      can_suspend_account: !deleted && accountStatus !== "suspended",
      can_revoke_sessions: activeTokens.length > 0 && !deleted,
      can_view_as_user: canViewAsUser,
    },
    confirmed: Boolean(user.confirmed),
    confirmed_at: user.confirmed_date,
    created_at: user.createdAt,
    delete_blocked_reason: blockedReason,
    deleted: Boolean(user.deleted),
    deleted_at: user.deletedAt,
    email: user.email,
    has_password: hasPassword,
    last_access_at: lastAccess,
    need_reset: Boolean(user.need_reset),
    provider: user.provider || "manual",
    provider_label: providerLabel(user.provider, hasPassword),
    sessions: {
      active_count: activeTokens.length,
      devices_count: deviceIds.size,
      last_access_at: lastAccess,
      source: "user_token",
    },
    source: "user+user_token",
  };
};

export const loadAccount = async (id: string) => {
  const repository = new AdminPatientAccountRepository();
  let profile = await repository.findPatient(id);

  if (profile && isSuspensionExpired(profile.user)) {
    await repository.activateExpiredSuspension(profile.user.id);
    profile = await repository.findPatient(id);
  }

  return { profile, repository };
};

export const createAudit = ({
  action,
  adminId,
  changedFields,
  metadata,
  reason,
  safeAfter,
  safeBefore,
  targetId,
}: AdminPatientAccountAudit): AdminPatientAccountAudit => ({
  action,
  adminId,
  changedFields,
  metadata,
  reason,
  safeAfter,
  safeBefore,
  targetId,
});

export const createStatusAudit = ({
  action,
  adminId,
  nextStatus,
  profile,
  reason,
  suspensionDurationDays,
  suspensionExpiresAt,
}: {
  action: Extract<
    AdminPatientAccountAudit["action"],
    "patient_account_deactivated" | "patient_account_suspended"
  >;
  adminId: string;
  nextStatus: AdminPatientAccountStatus;
  profile: AdminPatientAccountRecord;
  reason: string;
  suspensionDurationDays?: number;
  suspensionExpiresAt?: Date | null;
}): AdminPatientAccountAudit => {
  const currentStatus = normalizeAccountStatus(profile.user);
  const hasSuspensionDeadline = nextStatus === "suspended" && suspensionExpiresAt;

  return createAudit({
    action,
    adminId,
    changedFields: [
      "Status da conta",
      ...(hasSuspensionDeadline ? ["Prazo da suspensão"] : []),
      "Sessões",
    ],
    metadata: {
      previous_status: currentStatus,
      revoked_sessions_count: profile.user.user_tokens.length,
      status: nextStatus,
      ...(hasSuspensionDeadline
        ? {
            suspension_duration_days: suspensionDurationDays,
            suspension_expires_at: suspensionExpiresAt.toISOString(),
          }
        : {}),
    },
    reason,
    safeAfter: {
      Sessões: "Encerradas",
      "Status da conta": ACCOUNT_STATUS_LABELS[nextStatus],
      ...(hasSuspensionDeadline
        ? {
            "Prazo da suspensão": suspensionExpiresAt.toISOString(),
          }
        : {}),
    },
    safeBefore: {
      Sessões: `${profile.user.user_tokens.length} ativa(s)`,
      "Status da conta": ACCOUNT_STATUS_LABELS[currentStatus],
      ...(profile.user.account_status_expires_at
        ? {
            "Prazo da suspensão": profile.user.account_status_expires_at.toISOString(),
          }
        : {}),
    },
    targetId: profile.user.id,
  });
};

export const generateRecoveryCode = async (email: string) => {
  const encrypted = await encryptBcrypt(`${email}${v4()}${Date.now()}`);

  return encrypted.replace(/\//g, "");
};

export const sendConfirmationEmail = async (input: {
  code: string;
  email: string;
  name: string;
}) => {
  if (!hasTransactionalEmailConfig()) return false;

  return confirmEmailSend(input);
};

export const sendRecoveryEmail = async (input: { code: string; email: string; name: string }) => {
  if (!hasTransactionalEmailConfig()) return false;

  return recoveryEmailSend(input);
};

export const showAdminPatientAccount = async (
  data: IAdminPatientAccountShowDTO,
): Promise<Resolve> => {
  const { profile } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  return {
    status: 200,
    ...msg("show", {}),
    data: buildAccountDto(profile),
  };
};

export const accountResponse = async (id: string, messageKey: string): Promise<Resolve> => {
  const { profile } = await loadAccount(id);
  if (!profile) return profileNotFound();

  return {
    status: 200,
    ...msg(messageKey, {}),
    data: buildAccountDto(profile),
  };
};
