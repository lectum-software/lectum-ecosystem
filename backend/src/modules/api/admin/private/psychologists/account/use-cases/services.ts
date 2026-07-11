import { v4 } from "uuid";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { confirmEmailSend } from "@/modules/api/config/nodemailer/messages/confirm";
import { recoveryEmailSend } from "@/modules/api/config/nodemailer/messages/recovery";
import { code } from "@/utils/code";
import { encrypt } from "@/utils/crypt";
import { encrypt as encryptBcrypt } from "@/utils/crypt/bcrypt";
import type {
  AdminPsychologistAccountDTO,
  IAdminPsychologistAccountChangeEmailDTO,
  IAdminPsychologistAccountReasonDTO,
  IAdminPsychologistAccountRevokeSessionsDTO,
  IAdminPsychologistAccountSetTemporaryPasswordDTO,
  IAdminPsychologistAccountShowDTO,
} from "../DTOs/IAdminPsychologistAccountDTO";
import {
  type AdminPsychologistAccountAudit,
  type AdminPsychologistAccountRecord,
  AdminPsychologistAccountRepository,
} from "../repositories/AdminPsychologistAccountRepository";

const CHANGE_EMAIL_CONFIRMATION = "ALTERAR EMAIL";
const TEMP_PASSWORD_CONFIRMATION = "ALTERAR SENHA";
const REVOKE_SESSIONS_CONFIRMATION = "ENCERRAR SESSOES";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const latestAccessAt = (tokens: AdminPsychologistAccountRecord["user"]["user_tokens"]) => {
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
  ...error("admin_psychologist_account_email_provider_unavailable", {}),
});

const profileNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

const passwordSupportUnavailable = () => ({
  status: 403,
  ...error("admin_psychologist_account_password_support_unavailable", {}),
});

const buildAccountDto = (profile: AdminPsychologistAccountRecord): AdminPsychologistAccountDTO => {
  const user = profile.user;
  const hasPassword = Boolean(user.password);
  const activeTokens = user.user_tokens;
  const deviceIds = new Set(activeTokens.map((token) => token.device_id).filter(Boolean));
  const lastAccess = latestAccessAt(activeTokens);

  return {
    active: Boolean(user.active),
    capabilities: {
      can_change_email: hasPassword,
      can_send_email_confirmation: Boolean(user.email && !user.confirmed),
      can_send_password_reset: hasPassword,
      can_set_temporary_password: hasPassword,
      can_revoke_sessions: activeTokens.length > 0,
    },
    confirmed: Boolean(user.confirmed),
    confirmed_at: user.confirmed_date,
    created_at: user.createdAt,
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
  const repository = new AdminPsychologistAccountRepository();
  const profile = await repository.findPsychologist(id);

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
}: AdminPsychologistAccountAudit): AdminPsychologistAccountAudit => ({
  action,
  adminId,
  changedFields,
  metadata,
  reason,
  safeAfter,
  safeBefore,
  targetId,
});

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

export const showAdminPsychologistAccount = async (
  data: IAdminPsychologistAccountShowDTO,
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
