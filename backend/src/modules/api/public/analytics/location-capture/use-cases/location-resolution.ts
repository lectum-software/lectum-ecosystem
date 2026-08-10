import type { LocationResolution } from "../DTOs/ILocationCaptureDTO";

export const hasLocationCity = (location: Pick<LocationResolution, "city"> | null | undefined) =>
  Boolean(location?.city?.trim());

export const isMoreSpecificLocation = (
  location: Pick<LocationResolution, "city" | "state" | "country">,
  recentLocation: Pick<LocationResolution, "city" | "state" | "country"> | null | undefined,
) => {
  if (!recentLocation) return true;

  return Boolean(
    (!recentLocation.city && location.city) ||
      (!recentLocation.state && location.state) ||
      (!recentLocation.country && location.country),
  );
};

export const preferMostSpecificLocation = (
  proxyLocation: LocationResolution | null,
  providerLocation: LocationResolution | null,
): LocationResolution | null => {
  if (!proxyLocation) return providerLocation;
  if (!providerLocation) return proxyLocation;

  if (hasLocationCity(proxyLocation)) return proxyLocation;

  if (hasLocationCity(providerLocation)) {
    return {
      ...providerLocation,
      country: providerLocation.country ?? proxyLocation.country,
    };
  }

  if (!proxyLocation.state && providerLocation.state) {
    return {
      ...providerLocation,
      country: providerLocation.country ?? proxyLocation.country,
    };
  }

  return proxyLocation;
};
