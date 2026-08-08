type DeviceCarrier = {
  headers?: Record<string, unknown>;
};

export const getDevice = (data: DeviceCarrier): { err?: string; id: string } => {
  const rawDeviceId = data?.headers?.["x-device"];
  const deviceId = typeof rawDeviceId === "string" ? rawDeviceId.trim() : "";

  if (!/^[a-zA-Z0-9:_-]{8,256}$/.test(deviceId)) {
    return { err: "device_not_found", id: "" };
  }

  return { id: deviceId };
};
