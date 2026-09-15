import { S3Client } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY_SECRET!,
  },
});

const PUBLIC_BUCKET = process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME!;

const isR2Configured = () =>
  Boolean(
    process.env.CLOUDFLARE_R2_ENDPOINT?.trim() &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_SECRET?.trim() &&
      process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME?.trim(),
  );

export { isR2Configured, PUBLIC_BUCKET, S3 };
