import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { S3 } from "./s3";

export async function ensureBucketExists(bucketName: string) {
  try {
    await S3.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch (err: any) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      await S3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } else if (err.name === "NoSuchBucket") {
      await S3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } else if (err.name === "Forbidden") {
      throw new Error(`Sem permissão para criar bucket: ${bucketName}`);
    } else if (err.name !== "BucketAlreadyOwnedByYou") {
      throw err;
    }
  }
}
