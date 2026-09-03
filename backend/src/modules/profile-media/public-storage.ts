import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { publicFileKeyFromUrl } from "@/utils/public-origin";

const PROFILE_MEDIA_PREFIXES = [
  "psychologist/avatar/",
  "psychologist/cover-image/",
  "psychologist/video/",
  "psychologist/video-cover/",
] as const;

export const publicProfileMediaKeyFromUrl = (value?: string | null) =>
  publicFileKeyFromUrl(value, PROFILE_MEDIA_PREFIXES);

export const deletePublicProfileMedia = async (value?: string | null) => {
  const key = publicProfileMediaKeyFromUrl(value);
  if (!key) return;

  try {
    await S3.send(
      new DeleteObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: key,
      }),
    );
  } catch {
    // A troca de mídia não deve falhar por uma limpeza best effort do objeto anterior.
  }
};
