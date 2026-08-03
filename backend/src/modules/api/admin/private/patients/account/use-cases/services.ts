import { v4 } from "uuid";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { confirmEmailSend } from "@/modules/api/config/nodemailer/messages/confirm";
import { recoveryEmailSend } from "@/modules/api/config/nodemailer/messages/recovery";
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
import { AccountRepository } from "@/modules/api/private/account/repositories/AccountRepository";
import {
  isSuspensionExpired,
  isValidSuspensionDurationDays,
  suspensionExpiresAtFromDays,
} from "@/utils/account-status";
import {
  ADMIN_VIEW_AS_TOKEN_TTL_SECONDS,
  buildAdminViewAsDeviceId,
  isAdminViewAsDeviceId,
} from "@/utils/admin-view-as";
import { code } from "@/utils/code";
import { encrypt } from "@/utils/crypt";
import { encrypt as encryptBcrypt } from "@/utils/crypt/bcrypt";
import type {
  AdminPatientAccountDeleteDTO,
  AdminPatientAccountDTO,
  AdminPatientAccountStatus,
  AdminPatientAccountViewAsDTO,
  IAdminPatientAccountChangeEmailDTO,
  IAdminPatientAccountReasonDTO,
  IAdminPatientAccountRevokeSessionsDTO,
  IAdminPatientAccountSetTemporaryPasswordDTO,
  IAdminPatientAccountShowDTO,
  IAdminPatientAccountStatusActionDTO,
} from "../DTOs/IAdminPatientAccountDTO";
import {
  type AdminPatientAccountAudit,
  type AdminPatientAccountRecord,
  AdminPatientAccountRepository,
} from "../repositories/AdminPatientAccountRepository";

const CHANGE_EMAIL_CONFIRMATION = "ALTERAR E-MAIL";
const DEACTIVATE_ACCOUNT_CONFIRMATION = "DESATIVAR CONTA";
const DELETE_ACCOUNT_CONFIRMATION = "EXCLUIR CONTA";
const TEMP_PASSWORD_CONFIRMATION = "ALTERAR SENHA";
const REVOKE_SESSIONS_CONFIRMATION = "ENCERRAR SESSÕES";
const SUSPEND_ACCOUNT_CONFIRMATION = "SUSPENDER CONTA";
const VIEW_AS_START_PATH = "/app/perfil";

const normalizeStrongConfirmation = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, " ");

const matchesStrongConfirmation = (value: string, expected: string) =>
  normalizeStrongConfirmation(value) === normalizeStrongConfirmation(expected);

const ACCOUNT_STATUS_LABELS: Record<AdminPatientAccountStatus, string> = {
  active: "Ativa",
  deactivated: "Desativada",
  deleted: "Excluída",
  suspended: "Suspensa",
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const latestAccessAt = (tokens: AdminPatientAccountRecord["user"]["user_tokens"]) => {
  const token = tokens[0];
  if (!token) return null;

  return token.updatedAt > token.createdAt ? token.updatedAt : token.createdAt;
};

const maskEmail = (value?: string | null) => {
  const email = normalizeEmail(value || "");
  const [local, domain] = email.split("@");
  if (!local || !domain) return email ? "E-mail informado" : null;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
};

const providerLabel = (provider: string | null, hasPassword: boolean) => {
  if (provider === "google" && hasPassword) return "Google + senha local";
  if (provider === "google") return "Google";
  if (hasPassword) return "E-mail e senha";

  return provider || "Não informado";
};

const hasTransactionalEmailConfig = () => {
  const values = [
    process.env.EMAIL_API_EMAIL,
    process.env.EMAIL_API_KEY,
    process.env.EMAIL_API_HOST,
    process.env.EMAIL_API_PORT,
    process.env.EMAIL_API_SENDER,
  ];

  return values.every((value) => Boolean(value?.trim()));
};

const emailProviderUnavailable = () => ({
  status: 503,
  ...error("admin_patient_account_email_provider_unavailable", {}),
});

const profileNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient_profile" }),
});

const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

const passwordSupportUnavailable = () => ({
  status: 403,
  ...error("admin_patient_account_password_support_unavailable", {}),
});

const accountAlreadyDeleted = () => ({
  status: 410,
  ...error("admin_patient_account_already_deleted", {}),
});

const invalidStatusTransition = () => ({
  status: 400,
  ...error("admin_patient_account_status_transition_invalid", {}),
});

const invalidSuspensionDuration = () => ({
  status: 400,
  ...error("admin_patient_account_suspension_duration_invalid", {}),
});

const viewAsUnavailable = () => ({
  status: 400,
  ...error("admin_patient_account_view_as_unavailable", {}),
});

const normalizeAccountStatus = (
  user: AdminPatientAccountRecord["user"],
): AdminPatientAccountStatus => {
  if (user.deleted) return "deleted";

  const status = user.account_status;
  if (status === "active" || status === "suspended" || status === "deactivated") {
    return status;
  }

  return user.active ? "active" : "deactivated";
};

const deleteBlockedReason = () => null;

const buildAccountDto = (profile: AdminPatientAccountRecord): AdminPatientAccountDTO => {
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

const loadAccount = async (id: string) => {
  const repository = new AdminPatientAccountRepository();
  let profile = await repository.findPatient(id);

  if (profile && isSuspensionExpired(profile.user)) {
    await repository.activateExpiredSuspension(profile.user.id);
    profile = await repository.findPatient(id);
  }

  return { profile, repository };
};

const createAudit = ({
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

const createStatusAudit = ({
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

const generateRecoveryCode = async (email: string) => {
  const encrypted = await encryptBcrypt(`${email}${v4()}${Date.now()}`);

  return encrypted.replace(/\//g, "");
};

const sendConfirmationEmail = async (input: { code: string; email: string; name: string }) => {
  if (!hasTransactionalEmailConfig()) return false;

  return confirmEmailSend(input);
};

const sendRecoveryEmail = async (input: { code: string; email: string; name: string }) => {
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

const accountResponse = async (id: string, messageKey: string): Promise<Resolve> => {
  const { profile } = await loadAccount(id);
  if (!profile) return profileNotFound();

  return {
    status: 200,
    ...msg(messageKey, {}),
    data: buildAccountDto(profile),
  };
};

export const changeAdminPatientAccountEmail = async (
  data: IAdminPatientAccountChangeEmailDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_change_email) return passwordSupportUnavailable();

  if (!matchesStrongConfirmation(data.b.confirmation, CHANGE_EMAIL_CONFIRMATION)) {
    return {
      status: 400,
      ...error("admin_patient_account_change_email_confirmation_invalid", {}),
    };
  }

  const nextEmail = normalizeEmail(data.b.email);
  const currentEmail = normalizeEmail(profile.user.email);

  if (nextEmail === currentEmail) {
    return {
      status: 400,
      ...error("account_email_unchanged", {}),
    };
  }

  const existing = await repository.findUserByEmail(nextEmail);
  if (existing?.id && existing.id !== profile.user.id) {
    return {
      status: 409,
      ...error("account_email_already_exists", {}),
    };
  }

  const confirmCode = code();
  const sent = await sendConfirmationEmail({
    code: confirmCode,
    email: nextEmail,
    name: profile.user.name || nextEmail,
  });

  if (!sent) return emailProviderUnavailable();

  await repository.changeEmail({
    audit: createAudit({
      action: "patient_account_email_changed",
      adminId: admin.id,
      changedFields: ["E-mail da conta", "Status de confirmação", "Sessões"],
      metadata: {
        email_delivery_status: "sent",
        revoked_sessions_count: profile.user.user_tokens.length,
      },
      reason: data.b.reason,
      safeAfter: {
        "E-mail da conta": maskEmail(nextEmail),
        "Status de confirmação": "Pendente",
        Sessões: "Encerradas",
      },
      safeBefore: {
        "E-mail da conta": maskEmail(currentEmail),
        "Status de confirmação": profile.user.confirmed ? "Confirmado" : "Pendente",
        Sessões: `${profile.user.user_tokens.length} ativa(s)`,
      },
      targetId: profile.user.id,
    }),
    confirmCode,
    email: nextEmail,
    userId: profile.user.id,
  });

  return accountResponse(data.p.id, "admin_patient_account_email_changed");
};

export const sendAdminPatientAccountEmailConfirmation = async (
  data: IAdminPatientAccountReasonDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_send_email_confirmation) {
    return {
      status: 400,
      ...error("admin_patient_account_email_already_confirmed", {}),
    };
  }

  const confirmCode = code();
  const sent = await sendConfirmationEmail({
    code: confirmCode,
    email: profile.user.email,
    name: profile.user.name || profile.user.email,
  });

  if (!sent) return emailProviderUnavailable();

  await repository.saveEmailConfirmation({
    audit: createAudit({
      action: "patient_account_email_confirmation_sent",
      adminId: admin.id,
      changedFields: ["Confirmação de e-mail"],
      metadata: {
        email_delivery_status: "sent",
      },
      reason: data.b.reason,
      safeAfter: {
        "Confirmação de e-mail": "Novo código enviado",
        "E-mail da conta": maskEmail(profile.user.email),
      },
      safeBefore: {
        "Confirmação de e-mail": "Pendente",
        "E-mail da conta": maskEmail(profile.user.email),
      },
      targetId: profile.user.id,
    }),
    confirmCode,
    userId: profile.user.id,
  });

  return accountResponse(data.p.id, "admin_patient_account_email_confirmation_sent");
};

export const sendAdminPatientAccountPasswordReset = async (
  data: IAdminPatientAccountReasonDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_send_password_reset) return passwordSupportUnavailable();

  const recoveryCode = await generateRecoveryCode(profile.user.email);
  const sent = await sendRecoveryEmail({
    code: recoveryCode,
    email: profile.user.email,
    name: profile.user.name || profile.user.email,
  });

  if (!sent) return emailProviderUnavailable();

  await repository.savePasswordReset({
    audit: createAudit({
      action: "patient_account_password_reset_sent",
      adminId: admin.id,
      changedFields: ["Link de redefinição de senha"],
      metadata: {
        email_delivery_status: "sent",
      },
      reason: data.b.reason,
      safeAfter: {
        "Link de redefinição": "Enviado por e-mail",
        "E-mail da conta": maskEmail(profile.user.email),
      },
      safeBefore: {
        "Link de redefinição": "Solicitação administrativa",
        "E-mail da conta": maskEmail(profile.user.email),
      },
      targetId: profile.user.id,
    }),
    recoveryCode,
    userId: profile.user.id,
  });

  return {
    status: 200,
    ...msg("admin_patient_account_password_reset_sent", {}),
    data: buildAccountDto(profile),
  };
};

export const setAdminPatientAccountTemporaryPassword = async (
  data: IAdminPatientAccountSetTemporaryPasswordDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_set_temporary_password) return passwordSupportUnavailable();

  if (!matchesStrongConfirmation(data.b.confirmation, TEMP_PASSWORD_CONFIRMATION)) {
    return {
      status: 400,
      ...error("admin_patient_account_temporary_password_confirmation_invalid", {}),
    };
  }

  const passwordHash = await encrypt(data.b.password);

  await repository.setTemporaryPassword({
    audit: createAudit({
      action: "patient_account_temporary_password_set",
      adminId: admin.id,
      changedFields: ["Senha temporária", "Troca obrigatória", "Sessões"],
      metadata: {
        revoked_sessions_count: profile.user.user_tokens.length,
      },
      reason: data.b.reason,
      safeAfter: {
        "Senha temporária": "Definida sem armazenamento em auditoria",
        Sessões: "Encerradas",
        "Troca obrigatória": "Ativa",
      },
      safeBefore: {
        "Senha temporária": "Não exibida",
        Sessões: `${profile.user.user_tokens.length} ativa(s)`,
        "Troca obrigatória": profile.user.need_reset ? "Ativa" : "Inativa",
      },
      targetId: profile.user.id,
    }),
    passwordHash,
    userId: profile.user.id,
  });

  return accountResponse(data.p.id, "admin_patient_account_temporary_password_set");
};

const changeAccountStatus = async ({
  action,
  accountStatusExpiresAt,
  accountStatus,
  confirmation,
  data,
  invalidConfirmationKey,
  messageKey,
}: {
  accountStatus: "deactivated" | "suspended";
  accountStatusExpiresAt?: Date | null;
  action: Extract<
    AdminPatientAccountAudit["action"],
    "patient_account_deactivated" | "patient_account_suspended"
  >;
  confirmation: string;
  data: IAdminPatientAccountStatusActionDTO;
  invalidConfirmationKey: string;
  messageKey: string;
}): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const currentStatus = normalizeAccountStatus(profile.user);
  if (currentStatus === "deleted") return accountAlreadyDeleted();
  if (currentStatus === accountStatus) return invalidStatusTransition();

  if (!matchesStrongConfirmation(data.b.confirmation, confirmation)) {
    return {
      status: 400,
      ...error(invalidConfirmationKey, {}),
    };
  }

  await repository.updateAccountStatus({
    accountStatus,
    accountStatusExpiresAt: accountStatusExpiresAt ?? null,
    audit: createStatusAudit({
      action,
      adminId: admin.id,
      nextStatus: accountStatus,
      profile,
      reason: data.b.reason,
      suspensionDurationDays: data.b.suspension_duration_days,
      suspensionExpiresAt: accountStatusExpiresAt,
    }),
    userId: profile.user.id,
  });

  return accountResponse(data.p.id, messageKey);
};

export const suspendAdminPatientAccount = async (
  data: IAdminPatientAccountStatusActionDTO,
): Promise<Resolve> => {
  const durationDays = Number(data.b.suspension_duration_days);
  if (!isValidSuspensionDurationDays(durationDays)) return invalidSuspensionDuration();

  return changeAccountStatus({
    accountStatusExpiresAt: suspensionExpiresAtFromDays(durationDays),
    accountStatus: "suspended",
    action: "patient_account_suspended",
    confirmation: SUSPEND_ACCOUNT_CONFIRMATION,
    data,
    invalidConfirmationKey: "admin_patient_account_suspend_confirmation_invalid",
    messageKey: "admin_patient_account_suspended",
  });
};

export const deactivateAdminPatientAccount = async (
  data: IAdminPatientAccountStatusActionDTO,
): Promise<Resolve> =>
  changeAccountStatus({
    accountStatus: "deactivated",
    action: "patient_account_deactivated",
    confirmation: DEACTIVATE_ACCOUNT_CONFIRMATION,
    data,
    invalidConfirmationKey: "admin_patient_account_deactivate_confirmation_invalid",
    messageKey: "admin_patient_account_deactivated",
  });

export const deleteAdminPatientAccount = async (
  data: IAdminPatientAccountStatusActionDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const currentStatus = normalizeAccountStatus(profile.user);
  if (currentStatus === "deleted") return accountAlreadyDeleted();

  if (!matchesStrongConfirmation(data.b.confirmation, DELETE_ACCOUNT_CONFIRMATION)) {
    return {
      status: 400,
      ...error("admin_patient_account_delete_confirmation_invalid", {}),
    };
  }

  const accountRepository = new AccountRepository();

  await accountRepository.deleteOwnAccount(profile.user, {
    action: "patient_account_deleted",
    adminId: admin.id,
    area: "conta_e_acesso",
    changedFields: ["Status da conta", "Dados da conta", "Sessões", "Perfil do paciente"],
    domain: "patient_account",
    metadata: {
      deletion_mode: "soft_delete_anonymization",
      previous_status: currentStatus,
      revoked_sessions_count: profile.user.user_tokens.length,
      status: "deleted",
    },
    reason: data.b.reason,
    safeAfter: {
      "Dados da conta": "Anonimizados",
      "Perfil do paciente": "Removido",
      Sessões: "Encerradas",
      "Status da conta": ACCOUNT_STATUS_LABELS.deleted,
    },
    safeBefore: {
      "E-mail da conta": maskEmail(profile.user.email),
      Sessões: `${profile.user.user_tokens.length} ativa(s)`,
      "Status da conta": ACCOUNT_STATUS_LABELS[currentStatus],
    },
    targetId: profile.user.id,
    targetType: "patient",
  });

  const response: AdminPatientAccountDeleteDTO = {
    deleted: true,
    id: profile.user.id,
    source: "user+patient_profile+admin_activity_log",
  };

  return {
    status: 200,
    ...msg("admin_patient_account_deleted", {}),
    data: response,
  };
};

export const startAdminPatientAccountViewAs = async (
  data: IAdminPatientAccountReasonDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_view_as_user) return viewAsUnavailable();

  const deviceId = buildAdminViewAsDeviceId({
    adminId: admin.id,
    targetId: profile.user.id,
    targetRole: "paciente",
  });
  const token = generateToken(
    { email: profile.user.email, id: profile.user.id },
    "user",
    deviceId,
    { expiresIn: ADMIN_VIEW_AS_TOKEN_TTL_SECONDS },
  );

  await repository.createViewAsSession({
    audit: createAudit({
      action: "patient_account_view_as_started",
      adminId: admin.id,
      changedFields: ["Visualização administrativa"],
      metadata: {
        mode: "admin_view_as",
        read_only: true,
        start_path: VIEW_AS_START_PATH,
        target_role: "paciente",
        token_expires_in_seconds: ADMIN_VIEW_AS_TOKEN_TTL_SECONDS,
      },
      reason: data.b.reason,
      safeAfter: {
        "Modo de acesso": "Somente leitura",
        "Sessão de visualização": "Iniciada",
        "Validade da sessão": `${ADMIN_VIEW_AS_TOKEN_TTL_SECONDS} segundos`,
      },
      safeBefore: {
        "Modo de acesso": "Admin autenticado no painel",
        "Sessão de visualização": "Ausente",
      },
      targetId: profile.user.id,
    }),
    deviceId,
    token,
    userId: profile.user.id,
  });

  const response: AdminPatientAccountViewAsDTO = {
    mode: "admin_view_as",
    read_only: true,
    source: "user_token+admin_activity_log",
    start_path: VIEW_AS_START_PATH,
    target: {
      id: profile.user.id,
      name: profile.user.name || profile.user.email,
      role: "paciente",
    },
    token,
    token_expires_in_seconds: ADMIN_VIEW_AS_TOKEN_TTL_SECONDS,
  };

  return {
    status: 200,
    ...msg("admin_patient_account_view_as_started", {}),
    data: response,
  };
};

export const revokeAdminPatientAccountSessions = async (
  data: IAdminPatientAccountRevokeSessionsDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  if (!matchesStrongConfirmation(data.b.confirmation, REVOKE_SESSIONS_CONFIRMATION)) {
    return {
      status: 400,
      ...error("admin_patient_account_revoke_sessions_confirmation_invalid", {}),
    };
  }

  await repository.revokeSessions({
    audit: createAudit({
      action: "patient_account_sessions_revoked",
      adminId: admin.id,
      changedFields: ["Sessões"],
      metadata: {
        revoked_sessions_count: profile.user.user_tokens.length,
      },
      reason: data.b.reason,
      safeAfter: {
        Sessões: "Encerradas",
      },
      safeBefore: {
        Sessões: `${profile.user.user_tokens.length} ativa(s)`,
      },
      targetId: profile.user.id,
    }),
    userId: profile.user.id,
  });

  return accountResponse(data.p.id, "admin_patient_account_sessions_revoked");
};
