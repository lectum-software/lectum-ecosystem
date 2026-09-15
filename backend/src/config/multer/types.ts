import type { PublicImageMimeType } from "./public-image-policy";

/**
 * Contrato exclusivo de arquivos públicos. Upload privado não é suportado por
 * este middleware e deve usar uma infraestrutura separada e fail-closed.
 */
export type PublicUploadOption = (
  | { fields?: { name: string; maxCount: number }[] }
  | { array?: string }
  | { single?: string }
) & { allowed: PublicImageMimeType[]; cacheControl?: string; feature?: string; size: number };
