import { parsePublicHttpOrigin, publicFileKeyFromUrl, publicFileUrl } from "@/utils/public-origin";

const POST_MEDIA_PREFIXES = ["posts/media/"] as const;

export type ShareRenderSource = {
  sourceOrigin: string | null;
  sourceUrl: string;
};

export const resolveLegacyPostMediaSourceUrlForRender = (
  mediaUrl: string,
): ShareRenderSource | null => {
  const key = publicFileKeyFromUrl(mediaUrl, POST_MEDIA_PREFIXES);
  if (key) {
    const sourceUrl = publicFileUrl(key);
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol === "https:") return { sourceOrigin: null, sourceUrl: parsed.toString() };
    } catch {
      // Tenta a URL absoluta persistida abaixo para midias legadas entre origens publicas.
    }
  }

  try {
    const parsed = new URL(mediaUrl.trim());
    const origin = parsePublicHttpOrigin(parsed.origin, { productionRuntime: true });
    if (!origin) return null;

    const rawKey = publicFileKeyFromUrl(parsed.toString(), POST_MEDIA_PREFIXES, {
      baseUrl: origin,
      productionRuntime: true,
    });
    if (!rawKey) return null;

    return { sourceOrigin: null, sourceUrl: parsed.toString() };
  } catch {
    return null;
  }
};
