import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import type { Request } from "express";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { ensureBucketExists } from "./bucket";
import { streamToBuffer } from "./buffer";

export const storage = {
  _handleFile: async (
    req: Request & { medias?: any; uploadFeature?: string; uploads?: any },
    file: Express.Multer.File & { stream: NodeJS.ReadableStream },
    cb: (error: any, info?: any) => void,
  ) => {
    const feature = req.uploadFeature || req.baseUrl.split("/")[3];

    try {
      const originalname = Buffer.from(file.originalname, "latin1")
        .toString("utf8")
        .normalize("NFC");

      const type = file.mimetype.split("/")[1];

      const bucketName = PUBLIC_BUCKET;
      await ensureBucketExists(bucketName);

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
      const bodyToSend = buffer;
      const contentLength = buffer.length;
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: bodyToSend,
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
        size: file.size,
      });
    } catch (error) {
      cb(error);
    }
  },
  _removeFile: (_req: Request, _file: Express.Multer.File, cb: (error: any) => void) => {
    cb(null);
  },
};
