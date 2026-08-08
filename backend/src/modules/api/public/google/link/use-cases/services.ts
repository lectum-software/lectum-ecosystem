import jwt from "jsonwebtoken";
import { error, msg } from "@/helpers/translate";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { AccountRepository } from "@/modules/api/private/account/repositories/AccountRepository";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import { createGoogleOAuthLoginUrl, isGoogleOAuthConfigured } from "../../utils/config";
import type { GoogleLinkIntentResponse, IGoogleLinkDTO } from "../DTOs/IGoogleLinkDTO";

const LINK_TOKEN_EXPIRES_IN = "10m";

export const createIntent = async (data: IGoogleLinkDTO) => {
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

  if (!data.auth.id || !data.auth.email) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  if (data.auth.provider === "google") {
    return {
      status: 400,
      ...error("google_already_connected", {}),
    };
  }

  const token = jwt.sign(
    {
      intent: "link_google",
      user_id: data.auth.id,
      email: data.auth.email,
      device_id: device.id,
    },
    getJwtSecret(),
    { expiresIn: LINK_TOKEN_EXPIRES_IN },
  );

  const url = createGoogleOAuthLoginUrl(device.id);

  if (!url) {
    return {
      status: 403,
      ...error("google_oauth_not_configured", {}),
    };
  }

  url.searchParams.set("intent", "link");
  url.searchParams.set("link_token", token);
  url.searchParams.set("callbackUrl", "/app/configuracoes/conta?google=connected");

  const response: GoogleLinkIntentResponse = {
    url: url.toString(),
  };

  return {
    status: 200,
    ...msg("google_link_intent_created", {}),
    data: response,
  };
};

export const unlink = async (data: IGoogleLinkDTO) => {
  const device = getDevice(data);

  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  if (!data.auth.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  const repository = new AccountRepository();
  const current = await repository.findById(data.auth.id);

  if (!current?.id) {
    return {
      status: 404,
      ...error("account_not_found", {}),
    };
  }

  if (current.provider !== "google") {
    return {
      status: 400,
      ...error("google_not_connected", {}),
    };
  }

  if (!current.password) {
    return {
      status: 400,
      ...error("google_unlink_requires_password", {}),
    };
  }

  const updated = await repository.updateUserAndClearTokens(current.id, {
    provider: "manual",
  });
  const loginRepository = new LoginRepository(device.id);
  const hydrated = await loginRepository.hidrate(updated, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("google_unlink_success", {}),
    data: hydrated,
  };
};
