import { SEO_METADATA_DEFAULTS, type SeoMetadataPageKey } from "./metadata-settings";

type RouteSetting = {
  canonical_url: string | null;
  page_key: string;
  route_path: string | null;
};

const defaultsByKey = new Map<string, (typeof SEO_METADATA_DEFAULTS)[number]>(
  SEO_METADATA_DEFAULTS.map((setting) => [setting.page_key, setting]),
);

const legacyCanonicalByKey: Partial<Record<SeoMetadataPageKey, string>> = {
  community: "/community",
  psychologists: "/psychologists",
  top_mentors: "/community/top-mentors",
};

// A mesma projeção serve à leitura pública e à manutenção administrativa explícita.
// Somente aliases exatos gerenciados são normalizados; escolhas editoriais são preservadas.
export const managedSeoRouteDefaults = (
  setting: RouteSetting,
): Pick<RouteSetting, "canonical_url" | "route_path"> => {
  const defaults = defaultsByKey.get(setting.page_key);
  if (!defaults) {
    return { canonical_url: setting.canonical_url, route_path: setting.route_path };
  }

  const legacyCanonical = legacyCanonicalByKey[defaults.page_key];
  return {
    canonical_url:
      legacyCanonical !== undefined && setting.canonical_url === legacyCanonical
        ? (defaults.canonical_url ?? null)
        : setting.canonical_url,
    route_path: defaults.route_path,
  };
};
