import type { Request } from "express";
import jwt from "jsonwebtoken";
import { error, msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import { confirmEmailSend } from "@/modules/api/config/nodemailer/messages/confirm";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { getJwtSecret, JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import {
  createGoogleOAuthLoginUrl,
  GOOGLE_MANAGE_ACCOUNT_URL,
  isGoogleOAuthConfigured,
} from "@/modules/api/public/google/utils/config";
import { code } from "@/utils/code";
import { compare, encrypt } from "@/utils/crypt";
import { getUserRequestToken } from "@/utils/user-auth-cookie";
import type {
  AccountDeleteGoogleIntentResponse,
  AccountOnboardingTipsResponse,
  AccountSecurityResponse,
  IAccountDeleteDTO,
  IAccountDeleteGoogleIntentDTO,
  IAccountDTO,
  IAccountEmailDTO,
  IAccountOnboardingTipsDTO,
  IAccountPasswordDTO,
} from "../DTOs/IAccountDTO";
import { AccountRepository } from "../repositories/AccountRepository";
import {
  resolveAuthenticatedLogoutDeviceId,
  runBestEffortLogoutSubscriptionCleanup,
} from "../repositories/support/logout-subscription";
import {
  requiresGoogleDeleteReauth,
  requiresPasswordDeleteConfirmation,
} from "./delete-confirmation";

const DELETE_GOOGLE_REAUTH_TOKEN_EXPIRES_IN = "10m";
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeDeleteCallbackUrl = (value?: string | null, role?: string | null) => {
  const fallback =
    role === "psicologo"
      ? "/app/profissional/perfil/configurar?deleteReauth=ok"
      : "/app/perfil/editar?deleteReauth=ok";
  const raw = value?.trim() || fallback;

  if (!raw.startsWith("/app/")) return fallback;
  if (raw.startsWith("//")) return fallback;

  try {
    const url = new URL(raw, "https://lectum.local");
    url.searchParams.set("deleteReauth", "ok");

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const getCurrentUser = async (auth: user) => {
  if (!auth.id) return null;

  const repository = new AccountRepository();
  return repository.findById(auth.id);
};

const validateCurrentPassword = async (user: user, currentPassword: string) => {
  if (!user.password) {
    return {
      status: 403,
      ...error("account_password_login_unavailable", {}),
    };
  }

  const passwordMatches = await compare(currentPassword, user.password);

  if (!passwordMatches) {
    return {
      status: 403,
      ...error("account_current_password_invalid", {}),
    };
  }

  return null;
};

const hydrateUpdatedUser = async (user: user, deviceId: string) => {
  const loginRepository = new LoginRepository(deviceId);
  return loginRepository.hidrate(user, deviceId);
};

export const logout = async (data: IAccountDTO) => {
  const deviceId = resolveAuthenticatedLogoutDeviceId(data);
  const token = getUserRequestToken(data as unknown as Request);

  if (!deviceId || !data.auth.id || !token) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AccountRepository();
  await runBestEffortLogoutSubscriptionCleanup(
    () => repository.deactivateNotificationSubscriptions(data.auth.id!, deviceId),
    () => {
      console.warn("[AUTH] Notificações do dispositivo não puderam ser desativadas no logout.");
    },
  );
  await repository.deleteToken(data.auth.id, deviceId, token);

  return {
    status: 200,
    success: true,
  };
};

export const security = async (data: IAccountDTO) => {
  const current = await getCurrentUser(data.auth);

  if (!current) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const googleAvailable = isGoogleOAuthConfigured();
  const hasPassword = Boolean(current.password);
  const googleConnected = current.provider === "google";
  const response: AccountSecurityResponse = {
    email: current.email || null,
    provider: current.provider || null,
    confirmed: Boolean(current.confirmed),
    has_password: hasPassword,
    google: {
      available: googleAvailable,
      blocked_reason: googleAvailable ? undefined : "google_oauth_not_configured",
      connected: googleConnected,
      can_link: googleAvailable && !googleConnected,
      can_unlink: googleConnected && hasPassword,
      manage_url: GOOGLE_MANAGE_ACCOUNT_URL,
    },
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

export const onboardingTips = async (data: IAccountDTO) => {
  if (!data.auth.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const repository = new AccountRepository();
  const current = await repository.findOnboardingTips(data.auth.id);

  if (!current) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const response: AccountOnboardingTipsResponse = {
    has_seen_community_post_tip: Boolean(current.has_seen_community_post_tip),
    has_seen_discover_psychologists_tip: Boolean(current.has_seen_discover_psychologists_tip),
    has_seen_psychologists_my_search_tip: Boolean(current.has_seen_psychologists_my_search_tip),
    has_seen_psychologist_whatsapp_tip: Boolean(current.has_seen_psychologist_whatsapp_tip),
    has_seen_psychologist_profile_video_tip: Boolean(
      current.has_seen_psychologist_profile_video_tip,
    ),
    has_seen_psychologist_reply_tip: Boolean(current.has_seen_psychologist_reply_tip),
    has_seen_psychologist_original_post_tip: Boolean(
      current.has_seen_psychologist_original_post_tip,
    ),
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

export const updateOnboardingTips = async (data: IAccountOnboardingTipsDTO) => {
  const current = await getCurrentUser(data.auth);

  if (!current?.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const next = {
    ...(typeof data.b.has_seen_community_post_tip === "boolean"
      ? { has_seen_community_post_tip: data.b.has_seen_community_post_tip }
      : {}),
    ...(typeof data.b.has_seen_discover_psychologists_tip === "boolean"
      ? {
          has_seen_discover_psychologists_tip: data.b.has_seen_discover_psychologists_tip,
        }
      : {}),
    ...(typeof data.b.has_seen_psychologists_my_search_tip === "boolean"
      ? {
          has_seen_psychologists_my_search_tip: data.b.has_seen_psychologists_my_search_tip,
        }
      : {}),
    ...(typeof data.b.has_seen_psychologist_whatsapp_tip === "boolean"
      ? {
          has_seen_psychologist_whatsapp_tip: data.b.has_seen_psychologist_whatsapp_tip,
        }
      : {}),
    ...(typeof data.b.has_seen_psychologist_profile_video_tip === "boolean"
      ? {
          has_seen_psychologist_profile_video_tip: data.b.has_seen_psychologist_profile_video_tip,
        }
      : {}),
    ...(typeof data.b.has_seen_psychologist_reply_tip === "boolean"
      ? {
          has_seen_psychologist_reply_tip: data.b.has_seen_psychologist_reply_tip,
        }
      : {}),
    ...(typeof data.b.has_seen_psychologist_original_post_tip === "boolean"
      ? {
          has_seen_psychologist_original_post_tip: data.b.has_seen_psychologist_original_post_tip,
        }
      : {}),
  };

  const repository = new AccountRepository();
  const updated = await repository.updateOnboardingTips(current.id, next);
  const response: AccountOnboardingTipsResponse = {
    has_seen_community_post_tip: Boolean(updated.has_seen_community_post_tip),
    has_seen_discover_psychologists_tip: Boolean(updated.has_seen_discover_psychologists_tip),
    has_seen_psychologists_my_search_tip: Boolean(updated.has_seen_psychologists_my_search_tip),
    has_seen_psychologist_whatsapp_tip: Boolean(updated.has_seen_psychologist_whatsapp_tip),
    has_seen_psychologist_profile_video_tip: Boolean(
      updated.has_seen_psychologist_profile_video_tip,
    ),
    has_seen_psychologist_reply_tip: Boolean(updated.has_seen_psychologist_reply_tip),
    has_seen_psychologist_original_post_tip: Boolean(
      updated.has_seen_psychologist_original_post_tip,
    ),
  };

  return {
    status: 200,
    ...msg("update", {}),
    data: response,
  };
};

export const updateEmail = async (data: IAccountEmailDTO) => {
  const device = getDevice(data);

  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const repository = new AccountRepository();
  const current = await getCurrentUser(data.auth);

  if (!current?.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const passwordError = await validateCurrentPassword(current, data.b.current_password);
  if (passwordError) return passwordError;

  const nextEmail = normalizeEmail(data.b.email);
  const currentEmail = normalizeEmail(current.email || "");

  if (nextEmail === currentEmail) {
    return {
      status: 400,
      ...error("account_email_unchanged", {}),
    };
  }

  const existing = await repository.findByEmail(nextEmail);

  if (existing?.id && existing.id !== current.id) {
    return {
      status: 409,
      ...error("account_email_already_exists", {}),
    };
  }

  const confirmCode = code();

  const emailSent = await confirmEmailSend({
    email: nextEmail,
    name: current.name || nextEmail,
    code: confirmCode,
  });
  if (!emailSent) {
    return {
      status: 503,
      ...error("email_provider_unavailable", {}),
    };
  }

  const updated = await repository.updateUserAndClearTokens(current.id, {
    email: nextEmail,
    confirmed: false,
    confirmed_date: null,
    confirm_code: confirmCode,
    confirm_date: new Date(),
  });
  const hydrated = await hydrateUpdatedUser(updated, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("account_email_update_success", {}),
    data: hydrated,
  };
};

export const updatePassword = async (data: IAccountPasswordDTO) => {
  const device = getDevice(data);

  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const repository = new AccountRepository();
  const current = await getCurrentUser(data.auth);

  if (!current?.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const passwordError = await validateCurrentPassword(current, data.b.current_password);
  if (passwordError) return passwordError;

  const password = await encrypt(data.b.password);

  const updated = await repository.updateUserAndClearTokens(current.id, {
    password,
    password_confirm: null,
    need_reset: false,
  });
  const hydrated = await hydrateUpdatedUser(updated, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("account_password_update_success", {}),
    data: hydrated,
  };
};

export const createDeleteGoogleIntent = async (data: IAccountDeleteGoogleIntentDTO) => {
  const device = getDevice(data);

  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  if (!isGoogleOAuthConfigured()) {
    return {
      status: 403,
      ...error("google_oauth_not_configured", {}),
    };
  }

  const current = await getCurrentUser(data.auth);

  if (!current?.id || !current.email) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  if (!requiresGoogleDeleteReauth(current)) {
    return {
      status: 400,
      ...error("account_delete_google_reauth_unavailable", {}),
    };
  }

  const token = jwt.sign(
    {
      device_id: device.id,
      email: current.email,
      intent: "delete_account_google_reauth",
      user_id: current.id,
    },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: DELETE_GOOGLE_REAUTH_TOKEN_EXPIRES_IN },
  );

  const url = createGoogleOAuthLoginUrl(device.id);

  if (!url) {
    return {
      status: 403,
      ...error("google_oauth_not_configured", {}),
    };
  }

  url.searchParams.set("intent", "delete_account");
  url.searchParams.set("delete_token", token);
  url.searchParams.set("callbackUrl", sanitizeDeleteCallbackUrl(data.b.callback_url, current.role));

  const response: AccountDeleteGoogleIntentResponse = {
    url: url.toString(),
  };

  return {
    status: 200,
    ...msg("account_delete_google_intent_created", {}),
    data: response,
  };
};

export const destroy = async (data: IAccountDeleteDTO) => {
  const device = getDevice(data);

  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const repository = new AccountRepository();
  const current = await getCurrentUser(data.auth);

  if (!current?.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  if (data.b.confirmation.trim().toUpperCase() !== "EXCLUIR") {
    return {
      status: 400,
      ...error("account_delete_confirmation_invalid", {}),
    };
  }

  if (requiresGoogleDeleteReauth(current)) {
    const hasRecentGoogleReauth = await repository.hasRecentGoogleDeleteReauth(
      current.id,
      device.id,
    );

    if (!hasRecentGoogleReauth) {
      return {
        status: 403,
        ...error("account_delete_google_reauth_required", {}),
      };
    }
  } else if (requiresPasswordDeleteConfirmation(current)) {
    const passwordError = await validateCurrentPassword(current, data.b.current_password || "");
    if (passwordError) return passwordError;
  } else {
    return {
      status: 403,
      ...error("account_delete_identity_unavailable", {}),
    };
  }

  if (current.role === "psicologo") {
    const blockingSubscription = await repository.findBlockingSubscription(current.id);

    if (blockingSubscription) {
      return {
        status: 409,
        ...error("account_delete_active_subscription", {}),
      };
    }
  }

  await repository.deleteOwnAccount(current);

  return {
    status: 200,
    ...msg("account_delete_success", {}),
    data: true,
  };
};
