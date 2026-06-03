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

export { PUBLIC_BUCKET, S3 };
