import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
import { AccountRepository } from "@/modules/api/private/account/repositories/AccountRepository";
import { isValidSuspensionDurationDays, suspensionExpiresAtFromDays } from "@/utils/account-status";
import { ADMIN_VIEW_AS_TOKEN_TTL_SECONDS, buildAdminViewAsDeviceId } from "@/utils/admin-view-as";
import type {
  AdminPatientAccountDeleteDTO,
  AdminPatientAccountViewAsDTO,
  IAdminPatientAccountReasonDTO,
  IAdminPatientAccountRevokeSessionsDTO,
  IAdminPatientAccountStatusActionDTO,
} from "../../DTOs/IAdminPatientAccountDTO";
import type { AdminPatientAccountAudit } from "../../repositories/AdminPatientAccountRepository";

import {
  ACCOUNT_STATUS_LABELS,
  accountAlreadyDeleted,
  accountResponse,
  adminRequired,
  buildAccountDto,
  createAudit,
  createStatusAudit,
  DEACTIVATE_ACCOUNT_CONFIRMATION,
  DELETE_ACCOUNT_CONFIRMATION,
  invalidStatusTransition,
  invalidSuspensionDuration,
  loadAccount,
  maskEmail,
  matchesStrongConfirmation,
  normalizeAccountStatus,
  profileNotFound,
  REVOKE_SESSIONS_CONFIRMATION,
  SUSPEND_ACCOUNT_CONFIRMATION,
  VIEW_AS_START_PATH,
  viewAsUnavailable,
} from "./account-support";

export const changeAccountStatus = async ({
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
    allowAuthTokens: true,
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
