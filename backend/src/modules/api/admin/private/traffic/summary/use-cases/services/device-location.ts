import type {
  AdminOperatingSystemDeviceType,
  AdminOperatingSystemType,
} from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import type {
  AdminTrafficDeviceItem,
  AdminTrafficDeviceType,
  AdminTrafficLocationItem,
  AdminTrafficUserType,
  AdminTrafficUserTypeItem,
} from "../../DTOs/IAdminTrafficSummaryDTO";
import type {
  TrafficLocationRecord,
  TrafficSessionRecord,
} from "../../repositories/interfaces/IAdminTrafficRepository";

import {
  COUNTRY_LABELS,
  DEVICE_LABELS,
  safePercentage,
  sessionKey,
  TOP_LIMIT,
  type TrafficStats,
  USER_TYPE_LABELS,
} from "./overview";

export const normalizePhysicalDeviceType = (value: string): AdminOperatingSystemDeviceType => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const normalizeDeviceType = (
  session: TrafficSessionRecord,
  pwaSessionKeys: Set<string>,
): AdminTrafficDeviceType => {
  if (pwaSessionKeys.has(sessionKey(session))) return "pwa";

  return normalizePhysicalDeviceType(session.device_type);
};

export const buildDevices = (stats: TrafficStats) => {
  const pwaSessionKeys = new Set(
    stats.pageViews
      .filter((pageView) =>
        ["fullscreen", "minimal-ui", "standalone"].includes(pageView.display_mode),
      )
      .map((pageView) => sessionKey(pageView)),
  );
  const counts: Record<AdminTrafficDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    pwa: 0,
    tablet: 0,
    unknown: 0,
  };
  const operatingSystemCountsByDevice = new Map<
    AdminTrafficDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    (Object.keys(counts) as AdminTrafficDeviceType[]).map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );

  for (const session of stats.sessions) {
    const deviceType = normalizeDeviceType(session, pwaSessionKeys);
    const physicalDeviceType = normalizePhysicalDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, physicalDeviceType);
    counts[deviceType] += 1;
    const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
  }

  const total = stats.sessions.length;
  const items = (Object.keys(counts) as AdminTrafficDeviceType[])
    .map<AdminTrafficDeviceItem>((deviceType) => {
      const deviceTotal = counts[deviceType];
      const countsByOperatingSystem = operatingSystemCountsByDevice.get(deviceType);

      return {
        count: deviceTotal,
        device_type: deviceType,
        id: deviceType,
        label: DEVICE_LABELS[deviceType],
        operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
          count: countsByOperatingSystem?.[operatingSystem] ?? 0,
          id: operatingSystem,
          label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
          operating_system: operatingSystem,
          percentage: safePercentage(countsByOperatingSystem?.[operatingSystem] ?? 0, deviceTotal),
        }))
          .filter((operatingSystem) => operatingSystem.count > 0)
          .sort((left, right) => {
            if (right.count !== left.count) return right.count - left.count;

            return left.label.localeCompare(right.label, "pt-BR");
          }),
        percentage: safePercentage(deviceTotal, total),
      };
    })
    .filter((item) => item.count > 0 || item.device_type !== "pwa")
    .sort((left, right) => right.count - left.count);

  return {
    items,
    source: "visitor_session.device_type+visitor_session.os+page_view_event.display_mode" as const,
    total,
  };
};

export const buildUserTypes = (stats: TrafficStats) => {
  const counts: Record<AdminTrafficUserType, number> = {
    anonymous: 0,
    patients: 0,
    psychologists: 0,
  };

  for (const session of stats.sessions) {
    if (session.user?.role === "paciente") {
      counts.patients += 1;
      continue;
    }

    if (session.user?.role === "psicologo") {
      counts.psychologists += 1;
      continue;
    }

    counts.anonymous += 1;
  }

  const total = stats.sessions.length;
  const items = (Object.keys(counts) as AdminTrafficUserType[])
    .map<AdminTrafficUserTypeItem>((userType) => ({
      count: counts[userType],
      id: userType,
      label: USER_TYPE_LABELS[userType],
      percentage: safePercentage(counts[userType], total),
      user_type: userType,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    items,
    source: "visitor_session.user.role" as const,
    total,
  };
};

export const normalizeCountry = (country: string | null) => {
  const normalized = country?.trim();
  if (!normalized) return "Não identificado";

  const code = normalized.toUpperCase();
  return COUNTRY_LABELS[code] ?? normalized;
};

export const normalizeLocality = (value: string | null) => value?.trim() || "Não identificado";

export const buildLocationItems = (
  locations: TrafficLocationRecord[],
  totalVisitors: number,
  getGroup: (location: TrafficLocationRecord) => { id: string; label: string },
) => {
  const groups = new Map<string, { label: string; visitorIds: Set<string> }>();

  for (const location of locations) {
    const group = getGroup(location);
    const current = groups.get(group.id) ?? {
      label: group.label,
      visitorIds: new Set<string>(),
    };
    current.visitorIds.add(location.visitor_id);
    groups.set(group.id, current);
  }

  return [...groups.entries()]
    .map<AdminTrafficLocationItem>(([id, group]) => ({
      count: group.visitorIds.size,
      id,
      label: group.label,
      percentage: safePercentage(group.visitorIds.size, totalVisitors),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, TOP_LIMIT);
};

export const buildLocations = (stats: TrafficStats) => {
  const visitorsWithLocation = new Set(stats.locations.map((location) => location.visitor_id));
  const total = visitorsWithLocation.size;

  return {
    cities: buildLocationItems(stats.locations, total, (location) => {
      const city = normalizeLocality(location.city);
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);

      return {
        id: `${city}:${state}:${country}`,
        label:
          [city, state, country].filter((item) => item !== "Não identificado").join(", ") || city,
      };
    }),
    countries: buildLocationItems(stats.locations, total, (location) => {
      const country = normalizeCountry(location.country);

      return { id: country, label: country };
    }),
    source: "visitor_location" as const,
    states: buildLocationItems(stats.locations, total, (location) => {
      const state = normalizeLocality(location.state);
      const country = normalizeCountry(location.country);
      const label =
        country === "Brasil" || country === "Não identificado" ? state : `${state}, ${country}`;

      return { id: `${state}:${country}`, label };
    }),
    total,
  };
};
