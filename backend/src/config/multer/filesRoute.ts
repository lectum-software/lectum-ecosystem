import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Application, Response } from "express";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Middlewares
import authMiddleware from "@/modules/api/middlewares/_auth";

const getRequestedFile = (file?: string | string[]) => {
  return Array.isArray(file) ? file.join("/") : file;
};

const streamFile = async (file: string | undefined, res: Response) => {
  if (!file) {
    return send(res, {
      status: 404,
      ...error("not_found"),
      type: 2,
    });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: file,
    });
    const data = await S3.send(command);
    if (!data.Body) {
      return send(res, {
        status: 404,
        ...error("not_found"),
        type: 2,
      });
    }
    if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
    (data.Body as NodeJS.ReadableStream).pipe(res);
  } catch (_err: any) {
    return send(res, {
      status: 404,
      ...error("not_found"),
      type: 2,
    });
  }
};

export const filesRoute = (server: Application) => {
  server.get("/public/files/*file", async (req, res) => {
    const params = req.params as {
      file?: string | string[];
    };
    const file = getRequestedFile(params.file);

    if (
      !file?.startsWith("psychologist/avatar/") &&
      !file?.startsWith("psychologist/cover-image/") &&
      !file?.startsWith("psychologist/video/") &&
      !file?.startsWith("psychologist/video-cover/") &&
      !file?.startsWith("patient/avatar/")
    ) {
      return send(res, {
        status: 404,
        ...error("not_found"),
        type: 2,
      });
    }

    return streamFile(file, res);
  });

  server.get("/files/*file", authMiddleware, async (req, res) => {
    const params = req.params as {
      file?: string | string[];
    };
    return streamFile(getRequestedFile(params.file), res);
  });
};
