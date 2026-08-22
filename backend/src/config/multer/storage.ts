import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import type { Request } from "express";
import type multer from "multer";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { streamToBuffer } from "./buffer";
import { UploadInfrastructureError, UploadValidationError } from "./errors";
import { matchesDeclaredFileType } from "./file-signature";
import { acquireUploadSlot, releaseUploadSlot } from "./upload-concurrency";

type UploadSlotDependencies = {
  acquire: typeof acquireUploadSlot;
  isConfigured: typeof isR2Configured;
  release: typeof releaseUploadSlot;
};

const sanitizeOriginalFilename = (value: string) =>
  Array.from(Buffer.from(value, "latin1").toString("utf8").normalize("NFC"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .slice(0, 255);

const normalizeStorageError = (error: unknown) =>
  error instanceof Error ? error : new UploadInfrastructureError("R2_UPLOAD_FAILED");

const requestUploadSignal = (req: Request, stream: NodeJS.ReadableStream) => {
  const controller = new AbortController();
  const response = req.res;
  const abort = () => controller.abort();
  const abortClosedRequest = () => {
    if (!req.readableEnded) abort();
  };
  const abortClosedResponse = () => {
    if (!response?.writableEnded) abort();
  };
  const abortClosedStream = () => {
    const readable = stream as NodeJS.ReadableStream & { readableEnded?: boolean };
    if (!readable.readableEnded) abort();
  };

  req.once("aborted", abort);
  req.once("error", abort);
  req.once("close", abortClosedRequest);
  response?.once("close", abortClosedResponse);
  stream.once("error", abort);
  stream.once("close", abortClosedStream);

  if (req.aborted || (req.destroyed && !req.readableEnded)) abort();

  return {
    cleanup: () => {
      req.removeListener("aborted", abort);
      req.removeListener("error", abort);
      req.removeListener("close", abortClosedRequest);
      response?.removeListener("close", abortClosedResponse);
      stream.removeListener("error", abort);
      stream.removeListener("close", abortClosedStream);
    },
    signal: controller.signal,
  };
};

export const createPublicUploadStorage = ({
  acquire = acquireUploadSlot,
  isConfigured = isR2Configured,
  release = releaseUploadSlot,
}: Partial<UploadSlotDependencies> = {}): multer.StorageEngine => ({
  _handleFile: async (req, file, cb) => {
    const feature = req.uploadFeature || req.baseUrl.split("/")[3];
    const uploadSignal = requestUploadSignal(req, file.stream as NodeJS.ReadableStream);
    let hasUploadSlot = false;

    try {
      if (!isConfigured()) {
        throw new UploadInfrastructureError("R2_UPLOAD_NOT_CONFIGURED");
      }

      await acquire(uploadSignal.signal);
      hasUploadSlot = true;
      uploadSignal.signal.throwIfAborted();

      const originalname = sanitizeOriginalFilename(file.originalname);

      const type = file.mimetype.split("/")[1];

      // Este storage implementa somente o contrato público declarado em
      // `PublicUploadOption`; não reutilizá-lo para conteúdo privado.
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

      const buffer = await streamToBuffer(
        file.stream as NodeJS.ReadableStream,
        uploadSignal.signal,
      );
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
        CacheControl: req.uploadCacheControl ?? "public, max-age=31536000, immutable",
        ContentType: file.mimetype,
        ContentLength: contentLength,
      });
      await S3.send(uploadCommand, { abortSignal: uploadSignal.signal });

      cb(null, {
        bucket: bucketName,
        key,
        fileUrl,
        path: key,
        mimetype: file.mimetype,
        size: contentLength,
      });
    } catch (error) {
      cb(normalizeStorageError(error));
    } finally {
      uploadSignal.cleanup();
      if (hasUploadSlot) release();
    }
  },
  _removeFile: async (_req, file, cb) => {
    if (!file.key || file.bucket !== PUBLIC_BUCKET || !isR2Configured()) {
      cb(null);
      return;
    }

    try {
      await S3.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: file.key }));
      cb(null);
    } catch (error) {
      cb(normalizeStorageError(error));
    }
  },
});

export const storage = createPublicUploadStorage();
