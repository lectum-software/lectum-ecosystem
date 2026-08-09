type DeviceCarrier = {
  headers?: Record<string, unknown>;
};

export const normalizeDeviceId = (value: unknown) => {
  const deviceId = typeof value === "string" ? value.trim() : "";

  return /^[a-zA-Z0-9:_-]{8,256}$/.test(deviceId) ? deviceId : null;
};

export const getDevice = (data: DeviceCarrier): { err?: string; id: string } => {
  const deviceId = normalizeDeviceId(data?.headers?.["x-device"]);

  if (!deviceId) {
    return { err: "device_not_found", id: "" };
  }

  return { id: deviceId };
};
