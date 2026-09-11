import { publicFileKeyFromUrl } from "@/utils/public-origin";

// Somente admissão de mídia legada. Stream mantém sua validação de dono/contexto.
export const isPublicPostMediaUrl = (value?: string | null) =>
  publicFileKeyFromUrl(value, ["posts/media/"]) !== null;
