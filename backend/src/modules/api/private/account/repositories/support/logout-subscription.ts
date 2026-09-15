import { normalizeDeviceId } from "@/modules/api/middlewares/_auth/utils/device";

type AuthenticatedDeviceCarrier = {
  device?: unknown;
  headers?: unknown;
};

/**
 * Logout precisa revogar exatamente o device já autenticado pelo middleware.
 * Em uma sessão Admin view-as ele vem do JWT assinado, não do header normal do
 * navegador.
 */
export const resolveAuthenticatedLogoutDeviceId = (data: AuthenticatedDeviceCarrier) =>
  normalizeDeviceId(data.device);

export const buildLogoutSubscriptionFilter = (userId: string, deviceId: string) => ({
  deleted: false,
  device_id: deviceId,
  user_id: userId,
});

export const runBestEffortLogoutSubscriptionCleanup = async (
  cleanup: () => Promise<unknown>,
  onFailure: () => void,
) => {
  try {
    await cleanup();
    return true;
  } catch {
    onFailure();
    return false;
  }
};
