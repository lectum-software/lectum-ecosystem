export const ADMIN_OPERATING_SYSTEM_TYPES = [
  "android",
  "ios",
  "ipados",
  "windows",
  "macos",
  "other",
  "unknown",
] as const;

export type AdminOperatingSystemType = (typeof ADMIN_OPERATING_SYSTEM_TYPES)[number];

export type AdminOperatingSystemDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export const ADMIN_OPERATING_SYSTEM_LABELS: Record<AdminOperatingSystemType, string> = {
  android: "Android",
  ios: "iOS",
  ipados: "iPadOS",
  macos: "macOS",
  other: "Outros",
  unknown: "Não identificado",
  windows: "Windows",
};

export const normalizeAdminOperatingSystem = (
  os: string | null | undefined,
  deviceType: AdminOperatingSystemDeviceType,
): AdminOperatingSystemType => {
  const normalized = (os ?? "").trim().toLowerCase();

  if (!normalized || normalized === "unknown" || normalized === "nao_identificado") {
    return "unknown";
  }

  if (normalized === "android") return "android";

  if (normalized === "ios" || normalized === "ipados") {
    return deviceType === "tablet" ? "ipados" : "ios";
  }

  if (normalized === "macos" || normalized === "mac") {
    return deviceType === "mobile" || deviceType === "tablet" ? "ipados" : "macos";
  }

  if (normalized === "windows") return "windows";

  return "other";
};
