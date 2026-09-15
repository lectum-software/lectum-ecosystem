import { UploadValidationError } from "./errors";

export const PUBLIC_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PublicImageMimeType = (typeof PUBLIC_IMAGE_MIME_TYPES)[number];

export const isPublicImageMimeType = (value: string): value is PublicImageMimeType =>
  PUBLIC_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);

// R2 recebe somente imagens. Vídeos devem usar o contrato de upload do Stream,
// inclusive quando uma rota ou chamada interna configurar uma allowlist indevida.
export const assertPublicImageMimeType = (value: string, field?: string) => {
  if (!isPublicImageMimeType(value)) {
    throw new UploadValidationError("Envie uma imagem JPG, PNG ou WebP.", field);
  }
};
