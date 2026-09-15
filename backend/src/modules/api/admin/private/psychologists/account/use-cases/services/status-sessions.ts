import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
import { AccountRepository } from "@/modules/api/private/account/repositories/AccountRepository";
import { isValidSuspensionDurationDays, suspensionExpiresAtFromDays } from "@/utils/account-status";
import { ADMIN_VIEW_AS_TOKEN_TTL_SECONDS, buildAdminViewAsDeviceId } from "@/utils/admin-view-as";
import type {
  AdminPsychologistAccountDeleteDTO,
  AdminPsychologistAccountViewAsDTO,
  IAdminPsychologistAccountReasonDTO,
  IAdminPsychologistAccountRevokeSessionsDTO,
  IAdminPsychologistAccountStatusActionDTO,
} from "../../DTOs/IAdminPsychologistAccountDTO";
import type { AdminPsychologistAccountAudit } from "../../repositories/AdminPsychologistAccountRepository";

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
  findDeleteBlockingSubscription,
  invalidStatusTransition,
  invalidSuspensionDuration,
  loadAccount,
  maskEmail,
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
    AdminPsychologistAccountAudit["action"],
    "psychologist_account_deactivated" | "psychologist_account_suspended"
  >;
  confirmation: string;
  data: IAdminPsychologistAccountStatusActionDTO;
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

  if (data.b.confirmation.trim().toUpperCase() !== confirmation) {
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

export const suspendAdminPsychologistAccount = async (
  data: IAdminPsychologistAccountStatusActionDTO,
): Promise<Resolve> => {
  const durationDays = Number(data.b.suspension_duration_days);
  if (!isValidSuspensionDurationDays(durationDays)) return invalidSuspensionDuration();

  return changeAccountStatus({
    accountStatusExpiresAt: suspensionExpiresAtFromDays(durationDays),
    accountStatus: "suspended",
    action: "psychologist_account_suspended",
    confirmation: SUSPEND_ACCOUNT_CONFIRMATION,
    data,
    invalidConfirmationKey: "admin_psychologist_account_suspend_confirmation_invalid",
    messageKey: "admin_psychologist_account_suspended",
  });
};

export const deactivateAdminPsychologistAccount = async (
  data: IAdminPsychologistAccountStatusActionDTO,
): Promise<Resolve> =>
  changeAccountStatus({
    accountStatus: "deactivated",
    action: "psychologist_account_deactivated",
    confirmation: DEACTIVATE_ACCOUNT_CONFIRMATION,
    data,
    invalidConfirmationKey: "admin_psychologist_account_deactivate_confirmation_invalid",
    messageKey: "admin_psychologist_account_deactivated",
  });

export const deleteAdminPsychologistAccount = async (
  data: IAdminPsychologistAccountStatusActionDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const currentStatus = normalizeAccountStatus(profile.user);
  if (currentStatus === "deleted") return accountAlreadyDeleted();

  if (data.b.confirmation.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_psychologist_account_delete_confirmation_invalid", {}),
    };
  }

  const blockingSubscription = findDeleteBlockingSubscription(profile);
  if (blockingSubscription) {
    return {
      status: 409,
      ...error("account_delete_active_subscription", {}),
    };
  }

  const accountRepository = new AccountRepository();

  await accountRepository.deleteOwnAccount(profile.user, {
    adminId: admin.id,
    changedFields: ["Status da conta", "Dados da conta", "Sessões", "Perfil público"],
    metadata: {
      deletion_mode: "soft_delete_anonymization",
      previous_status: currentStatus,
      revoked_sessions_count: profile.user.user_tokens.length,
      status: "deleted",
    },
    reason: data.b.reason,
    safeAfter: {
      "Dados da conta": "Anonimizados",
      "Perfil público": "Removido",
      Sessões: "Encerradas",
      "Status da conta": ACCOUNT_STATUS_LABELS.deleted,
    },
    safeBefore: {
      "E-mail da conta": maskEmail(profile.user.email),
      Sessões: `${profile.user.user_tokens.length} ativa(s)`,
      "Status da conta": ACCOUNT_STATUS_LABELS[currentStatus],
    },
    targetId: profile.user.id,
  });

  const response: AdminPsychologistAccountDeleteDTO = {
    deleted: true,
    id: profile.user.id,
    source: "user+psychologist_profile+admin_activity_log",
  };

  return {
    status: 200,
    ...msg("admin_psychologist_account_deleted", {}),
    data: response,
  };
};

export const startAdminPsychologistAccountViewAs = async (
  data: IAdminPsychologistAccountReasonDTO,
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
    targetRole: "psicologo",
  });
  const token = generateToken(
    { email: profile.user.email, id: profile.user.id },
    "user",
    deviceId,
    { expiresIn: ADMIN_VIEW_AS_TOKEN_TTL_SECONDS },
  );

  await repository.createViewAsSession({
    audit: createAudit({
      action: "psychologist_account_view_as_started",
      adminId: admin.id,
      changedFields: ["Visualização administrativa"],
      metadata: {
        mode: "admin_view_as",
        read_only: true,
        start_path: VIEW_AS_START_PATH,
        target_role: "psicologo",
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

  const response: AdminPsychologistAccountViewAsDTO = {
    mode: "admin_view_as",
    read_only: true,
    source: "user_token+admin_activity_log",
    start_path: VIEW_AS_START_PATH,
    target: {
      id: profile.user.id,
      name: profile.user.name || profile.user.email,
      role: "psicologo",
    },
    token,
    token_expires_in_seconds: ADMIN_VIEW_AS_TOKEN_TTL_SECONDS,
  };
  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("admin_psychologist_account_view_as_started", {}),
    data: response,
  };
};

export const revokeAdminPsychologistAccountSessions = async (
  data: IAdminPsychologistAccountRevokeSessionsDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  if (data.b.confirmation.trim().toUpperCase() !== REVOKE_SESSIONS_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_psychologist_account_revoke_sessions_confirmation_invalid", {}),
    };
  }

  await repository.revokeSessions({
    audit: createAudit({
      action: "psychologist_account_sessions_revoked",
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

  return accountResponse(data.p.id, "admin_psychologist_account_sessions_revoked");
};
