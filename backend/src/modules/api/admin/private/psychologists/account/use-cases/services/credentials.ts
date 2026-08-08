import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { code } from "@/utils/code";
import { encrypt } from "@/utils/crypt";
import type {
  IAdminPsychologistAccountChangeEmailDTO,
  IAdminPsychologistAccountReasonDTO,
  IAdminPsychologistAccountSetTemporaryPasswordDTO,
} from "../../DTOs/IAdminPsychologistAccountDTO";

import {
  accountResponse,
  adminRequired,
  buildAccountDto,
  CHANGE_EMAIL_CONFIRMATION,
  createAudit,
  emailProviderUnavailable,
  generateRecoveryCode,
  loadAccount,
  maskEmail,
  normalizeEmail,
  passwordSupportUnavailable,
  profileNotFound,
  sendConfirmationEmail,
  sendRecoveryEmail,
  TEMP_PASSWORD_CONFIRMATION,
} from "./account-support";

export const changeAdminPsychologistAccountEmail = async (
  data: IAdminPsychologistAccountChangeEmailDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_change_email) return passwordSupportUnavailable();

  if (data.b.confirmation.trim().toUpperCase() !== CHANGE_EMAIL_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_psychologist_account_change_email_confirmation_invalid", {}),
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
      action: "psychologist_account_email_changed",
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

  return accountResponse(data.p.id, "admin_psychologist_account_email_changed");
};

export const sendAdminPsychologistAccountEmailConfirmation = async (
  data: IAdminPsychologistAccountReasonDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_send_email_confirmation) {
    return {
      status: 400,
      ...error("admin_psychologist_account_email_already_confirmed", {}),
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
      action: "psychologist_account_email_confirmation_sent",
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

  return accountResponse(data.p.id, "admin_psychologist_account_email_confirmation_sent");
};

export const sendAdminPsychologistAccountPasswordReset = async (
  data: IAdminPsychologistAccountReasonDTO,
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
      action: "psychologist_account_password_reset_sent",
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
    ...msg("admin_psychologist_account_password_reset_sent", {}),
    data: buildAccountDto(profile),
  };
};

export const setAdminPsychologistAccountTemporaryPassword = async (
  data: IAdminPsychologistAccountSetTemporaryPasswordDTO,
): Promise<Resolve> => {
  const admin = data.admin;
  if (!admin?.id) return adminRequired();

  const { profile, repository } = await loadAccount(data.p.id);
  if (!profile) return profileNotFound();

  const account = buildAccountDto(profile);
  if (!account.capabilities.can_set_temporary_password) return passwordSupportUnavailable();

  if (data.b.confirmation.trim().toUpperCase() !== TEMP_PASSWORD_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_psychologist_account_temporary_password_confirmation_invalid", {}),
    };
  }

  const passwordHash = await encrypt(data.b.password);

  await repository.setTemporaryPassword({
    audit: createAudit({
      action: "psychologist_account_temporary_password_set",
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

  return accountResponse(data.p.id, "admin_psychologist_account_temporary_password_set");
};
