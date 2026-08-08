import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import type { Request } from "express";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { parsePositiveInteger } from "@/utils/runtime-config";
import { streamToBuffer } from "./buffer";
import { UploadInfrastructureError, UploadValidationError } from "./errors";
import { matchesDeclaredFileType } from "./file-signature";

const maxConcurrentUploads = parsePositiveInteger(process.env.UPLOAD_MAX_CONCURRENCY, 2, {
  max: 16,
});
const maxQueuedUploads = parsePositiveInteger(process.env.UPLOAD_MAX_QUEUE_SIZE, 100, {
  max: 1000,
});
let activeUploads = 0;
const uploadQueue: Array<() => void> = [];

const sanitizeOriginalFilename = (value: string) =>
  Array.from(Buffer.from(value, "latin1").toString("utf8").normalize("NFC"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .slice(0, 255);

const acquireUploadSlot = async () => {
  if (activeUploads >= maxConcurrentUploads) {
    if (uploadQueue.length >= maxQueuedUploads) {
      throw new UploadInfrastructureError("R2_UPLOAD_QUEUE_FULL");
    }

    await new Promise<void>((resolve) => uploadQueue.push(resolve));
  }

  activeUploads += 1;
};

const releaseUploadSlot = () => {
  activeUploads = Math.max(0, activeUploads - 1);
  uploadQueue.shift()?.();
};

export const storage = {
  _handleFile: async (
    req: Request & { medias?: any; uploadFeature?: string; uploads?: any },
    file: Express.Multer.File & { stream: NodeJS.ReadableStream },
    cb: (error: any, info?: any) => void,
  ) => {
    const feature = req.uploadFeature || req.baseUrl.split("/")[3];
    let hasUploadSlot = false;

    try {
      if (!isR2Configured()) {
        throw new UploadInfrastructureError("R2_UPLOAD_NOT_CONFIGURED");
      }

      await acquireUploadSlot();
      hasUploadSlot = true;

      const originalname = sanitizeOriginalFilename(file.originalname);

      const type = file.mimetype.split("/")[1];

      const bucketName = PUBLIC_BUCKET;

      const folder = file.fieldname;
      const fileUrl = `${createId()}.${type}`;
      const key = feature ? `${feature}/${folder}/${fileUrl}` : `${folder}/${fileUrl}`;

      const files = [...(req?.medias?.[folder] || []), fileUrl];
      req.medias = {
        ...(req.medias || {}),
        [folder]: files,
      };
      req.uploads = {
        ...req.uploads,
        [folder]: fileUrl,
      };

      req.file_names = {
        ...req.file_names,
        [fileUrl]: originalname,
      };

      req.feature = feature;
      req.bucket = bucketName;

      const buffer = await streamToBuffer(file.stream as NodeJS.ReadableStream);
      if (!matchesDeclaredFileType(buffer, file.mimetype)) {
        throw new UploadValidationError(
          "O conteúdo do arquivo não corresponde ao formato informado.",
          file.fieldname,
        );
      }

      const bodyToSend = buffer;
      const contentLength = buffer.length;
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: bodyToSend,
        CacheControl: "public, max-age=31536000, immutable",
        ContentType: file.mimetype,
        ContentLength: contentLength,
      });
      await S3.send(uploadCommand);

      cb(null, {
        bucket: bucketName,
        key,
        fileUrl,
        path: key,
        mimetype: file.mimetype,
        size: contentLength,
      });
    } catch (error) {
      cb(error);
    } finally {
      if (hasUploadSlot) releaseUploadSlot();
    }
  },
  _removeFile: async (
    _req: Request,
    file: Express.Multer.File & { bucket?: string; key?: string },
    cb: (error: any) => void,
  ) => {
    if (!file.key || file.bucket !== PUBLIC_BUCKET || !isR2Configured()) {
      cb(null);
      return;
    }

    try {
      await S3.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: file.key }));
      cb(null);
    } catch (error) {
      cb(error);
    }
  },
};
