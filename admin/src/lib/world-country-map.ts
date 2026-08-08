import worldCountryMapPaths from "./world-country-map.json";

// Fonte cartográfica: world-atlas 110m (Natural Earth / topojson, MIT).
// https://github.com/topojson/world-atlas
export type WorldCountryMapPath = {
  d: string;
  id: string;
  name: string;
};

export const WORLD_COUNTRY_MAP_PATHS =
  worldCountryMapPaths satisfies readonly WorldCountryMapPath[];
