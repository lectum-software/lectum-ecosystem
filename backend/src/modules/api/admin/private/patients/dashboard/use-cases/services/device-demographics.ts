import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import { endOfDate, parseDateOnly, toDateKey } from "@/utils/date-range";
import type {
  AdminPatientsDashboardBreakdownItem,
  AdminPatientsDashboardDateRange,
  AdminPatientsDashboardDeviceType,
  AdminPatientsDashboardSummary,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import type {
  AdminPatientLocationRecord,
  AdminPatientPageViewRecord,
  AdminPatientPlatformSessionRecord,
  AdminPatientSnapshotRecord,
} from "../../repositories/AdminPatientsDashboardRepository";

import {
  COUNTRY_LABELS,
  DEVICE_LABELS,
  GENDER_LABELS,
  PATIENT_PAGE_KIND_LABELS,
  SIGNUP_SOURCE_OPTIONS,
  type SignupSource,
  safePercentage,
} from "./intent-support";

export const normalizeDeviceType = (value: string): AdminPatientsDashboardDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const buildDeviceUsage = (sessions: AdminPatientPlatformSessionRecord[]) => {
  const counts: Record<AdminPatientsDashboardDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const activePatientsByDevice = new Map<AdminPatientsDashboardDeviceType, Set<string>>(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Set<string>(),
    ]),
  );
  const operatingSystemCountsByDevice = new Map<
    AdminPatientsDashboardDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );
  const activePatientsByDeviceAndOperatingSystem = new Map<
    AdminPatientsDashboardDeviceType,
    Map<AdminOperatingSystemType, Set<string>>
  >(
    (Object.keys(counts) as AdminPatientsDashboardDeviceType[]).map((deviceType) => [
      deviceType,
      new Map(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
      ),
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    if (session.user_id) activePatientsByDevice.get(deviceType)?.add(session.user_id);
    const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
    if (session.user_id) {
      activePatientsByDeviceAndOperatingSystem
        .get(deviceType)
        ?.get(operatingSystem)
        ?.add(session.user_id);
    }
  }

  const totalSessions = sessions.length;
  const totalActivePatients = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: (Object.keys(counts) as AdminPatientsDashboardDeviceType[])
      .map((deviceType) => {
        const deviceTotal = counts[deviceType];
        const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
        const activePatientsByOperatingSystem =
          activePatientsByDeviceAndOperatingSystem.get(deviceType);

        return {
          active_patients_count: activePatientsByDevice.get(deviceType)?.size ?? 0,
          count: deviceTotal,
          device_type: deviceType,
          id: deviceType,
          label: DEVICE_LABELS[deviceType],
          operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
            active_patients_count: activePatientsByOperatingSystem?.get(operatingSystem)?.size ?? 0,
            count: countsByOperatingSystem?.[operatingSystem] ?? 0,
            id: operatingSystem,
            label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
            operating_system: operatingSystem,
            percentage: safePercentage(
              countsByOperatingSystem?.[operatingSystem] ?? 0,
              deviceTotal,
            ),
          }))
            .filter((operatingSystem) => operatingSystem.count > 0)
            .sort((left, right) => {
              if (right.count !== left.count) return right.count - left.count;

              return left.label.localeCompare(right.label, "pt-BR");
            }),
          percentage: safePercentage(deviceTotal, totalSessions),
        };
      })
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;

        return left.label.localeCompare(right.label, "pt-BR");
      }),
    source: "visitor_session.device_type+visitor_session.os+user.role=paciente" as const,
    total_active_patients: totalActivePatients,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0 ? "Sem sessões autenticadas de pacientes no período selecionado." : null,
  };
};

export const buildOperatingSystemUsage = (sessions: AdminPatientPlatformSessionRecord[]) => {
  const counts = Object.fromEntries(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
  ) as Record<AdminOperatingSystemType, number>;
  const activePatientsByOperatingSystem = new Map<AdminOperatingSystemType, Set<string>>(
    ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, new Set<string>()]),
  );

  for (const session of sessions) {
    const deviceType = normalizeDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[operatingSystem] += 1;
    if (session.user_id) activePatientsByOperatingSystem.get(operatingSystem)?.add(session.user_id);
  }

  const totalSessions = sessions.length;
  const totalActivePatients = new Set(
    sessions
      .map((session) => session.user_id)
      .filter((userId): userId is string => Boolean(userId)),
  ).size;

  return {
    items: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
      active_patients_count: activePatientsByOperatingSystem.get(operatingSystem)?.size ?? 0,
      count: counts[operatingSystem],
      id: operatingSystem,
      label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
      operating_system: operatingSystem,
      percentage: safePercentage(counts[operatingSystem], totalSessions),
    })).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.os+visitor_session.device_type+user.role=paciente" as const,
    total_active_patients: totalActivePatients,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas de pacientes com sistema operacional no período selecionado."
        : null,
  };
};

export const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const normalizeName = (name: string) => name.replace(/\s+/g, " ").trim() || "Paciente";

export const normalizeGender = (value?: string | null) => {
  const key = normalizeKey(value || "nao_informado");

  return {
    id: key || "nao_informado",
    label: GENDER_LABELS[key] ?? value?.trim() ?? "Não informado",
  };
};

export const signupSourceFromProvider = (provider?: string | null): SignupSource => {
  const normalized = (provider ?? "").trim().toLowerCase();

  return normalized === "google" ? SIGNUP_SOURCE_OPTIONS[1] : SIGNUP_SOURCE_OPTIONS[0];
};

export const providerLabel = (provider: string) => signupSourceFromProvider(provider).label;

export const dateInRange = (date: Date, range: AdminPatientsDashboardDateRange) =>
  date >= range.start && date <= range.end;

export const createdUntil = (patient: AdminPatientSnapshotRecord, date: Date) =>
  patient.createdAt <= date;

export const buildSeries = (
  patients: AdminPatientSnapshotRecord[],
  labels: string[],
): AdminPatientsDashboardSummary["series"]["points"] =>
  labels.map((label) => {
    const dayEnd = endOfDate(parseDateOnly(label, "start") ?? new Date(label));
    const visible = patients.filter((patient) => patient.createdAt <= dayEnd);

    return {
      active_patients: visible.filter((patient) => patient.active).length,
      date: label,
      inactive_patients: visible.filter((patient) => !patient.active).length,
      new_signups: patients.filter((patient) => toDateKey(patient.createdAt) === label).length,
      total_patients: visible.length,
    };
  });

export const buildBreakdown = (
  items: Array<{ id: string; label: string }>,
  total: number,
  limit = 8,
): AdminPatientsDashboardBreakdownItem[] => {
  return buildBreakdownFromGroups(items, total).slice(0, limit);
};

export const buildBreakdownFromGroups = (
  items: Array<{ id: string; label: string }>,
  total: number,
): AdminPatientsDashboardBreakdownItem[] => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const current = counts.get(item.id) ?? { count: 0, label: item.label };
    counts.set(item.id, { ...current, count: current.count + 1 });
  }

  return [...counts.entries()]
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });
};

export const buildPrivacyAwareCityBreakdown = (
  items: Array<{ id: string; label: string }>,
  total: number,
  limit = 10,
): AdminPatientsDashboardBreakdownItem[] => {
  const aggregated = buildBreakdownFromGroups(items, total);
  const cityPrivacyThreshold = 2;
  const visible = aggregated.filter(
    (item) =>
      item.count >= cityPrivacyThreshold ||
      item.id.includes("nao_identificado") ||
      item.id.includes("nao_informado") ||
      item.label === "Não identificado" ||
      item.label === "Não informado",
  );
  const groupedCount = aggregated
    .filter((item) => !visible.some((visibleItem) => visibleItem.id === item.id))
    .reduce((sum, item) => sum + item.count, 0);
  const withGroupedCities =
    groupedCount > 0
      ? visible.concat({
          count: groupedCount,
          id: "outras_cidades",
          label: "Outras cidades",
          percentage: safePercentage(groupedCount, total),
        })
      : visible;

  return withGroupedCities
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    })
    .slice(0, limit);
};

export const buildSignupSourceBreakdown = (
  patients: AdminPatientSnapshotRecord[],
): AdminPatientsDashboardBreakdownItem[] => {
  if (patients.length === 0) return [];

  const counts = new Map<SignupSource["id"], number>(
    SIGNUP_SOURCE_OPTIONS.map((source) => [source.id, 0] as const),
  );

  for (const patient of patients) {
    const source = signupSourceFromProvider(patient.provider);
    counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
  }

  return SIGNUP_SOURCE_OPTIONS.map((source) => {
    const count = counts.get(source.id) ?? 0;

    return {
      count,
      id: source.id,
      label: source.label,
      percentage: safePercentage(count, patients.length),
    };
  });
};

export const buildDemographics = (patients: AdminPatientSnapshotRecord[]) => ({
  gender: {
    items: buildBreakdown(
      patients.map((patient) => normalizeGender(patient.patient_profile?.gender)),
      patients.length,
      5,
    ),
    source: "patient_profile.gender" as const,
    total: patients.length,
  },
  signup_sources: {
    items: buildSignupSourceBreakdown(patients),
    source: "user.provider" as const,
    total: patients.length,
  },
});

export const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não informado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

export const normalizeLocality = (value: string | null) => value?.trim() || "Não informado";

export const buildLocationBreakdown = (
  locations: AdminPatientLocationRecord[],
  total: number,
  getGroup: (location: AdminPatientLocationRecord) => { id: string; label: string },
) => buildBreakdown(locations.map(getGroup), total, 10);

export const buildLocations = (locations: AdminPatientLocationRecord[]) => {
  const total = locations.length;

  return {
    cities: buildPrivacyAwareCityBreakdown(
      locations.map((location) => {
        const city = normalizeLocality(location.city);
        const state = normalizeLocality(location.state);
        const country = normalizeCountry(location.country);
        const label =
          [city, state, country].filter((item) => item !== "Não informado").join(", ") || city;

        return {
          id: `${city}:${state}:${country}`,
          label,
        };
      }),
      total,
      10,
    ),
    countries: buildLocationBreakdown(locations, total, (location) => {
      const country = normalizeCountry(location.country);

      return { id: country, label: country };
    }),
    source: "patient_profile.city/state" as const,
    states: buildLocationBreakdown(locations, total, (location) => {
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        country === "Brasil" || country === "Não informado" ? state : `${state}, ${country}`;

      return { id: `${state}:${country}`, label };
    }),
    total,
  };
};

export const patientPlatformPageLabel = (
  view: Pick<AdminPatientPageViewRecord, "normalized_path" | "page_kind" | "path">,
) => {
  const path = (view.normalized_path || view.path || "/").split("?")[0] ?? "/";
  const segments = path.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (joined.includes("post")) return "Posts";
  if (joined.includes("community")) return "Comunidades";
  if (joined.includes("favorite") || joined.includes("favoritos")) return "Favoritos";
  if (joined.includes("notification") || joined.includes("notificacoes")) return "Notificações";
  if (
    joined.includes("settings") ||
    joined.includes("configuracoes") ||
    joined.includes("account")
  ) {
    return "Configurações";
  }
  if (joined.includes("psychologist") || joined.includes("psicologo")) return "Psicólogos";
  if (joined.includes("profile") || joined.includes("perfil")) return "Perfil";
  if (joined.startsWith("app")) return "Área do paciente";

  return PATIENT_PAGE_KIND_LABELS[view.page_kind] ?? "Outras páginas";
};
