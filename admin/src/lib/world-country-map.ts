import worldCountryMapPaths from "./world-country-map.json";

// Fonte cartográfica: world-atlas 110m (Natural Earth / topojson, MIT).
// https://github.com/topojson/world-atlas
export type WorldCountryMapPath = {
  d: string;
  id: string;
  mapKey: string;
  name: string;
};

// Algumas geometrias não possuem ID cartográfico; o nome as distingue sem inventar ISO.
export const WORLD_COUNTRY_MAP_PATHS: readonly WorldCountryMapPath[] = worldCountryMapPaths.map(
  (country) => ({ ...country, mapKey: `${country.id}:${country.name}` }),
);
