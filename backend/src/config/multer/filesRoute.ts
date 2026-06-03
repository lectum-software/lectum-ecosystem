import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Application } from "express";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Middlewares
import authMiddleware from "@/modules/api/middlewares/_auth";

export const filesRoute = (server: Application) => {
  server.get("/files/*file", authMiddleware, async (req, res) => {
    const params = req.params as {
      file?: string | string[];
    };
    const file = Array.isArray(params.file) ? params.file.join("/") : params.file;

    if (!file)
      return send(res, {
        status: 404,
        ...error("not_found"),
        type: 2,
      });

    try {
      const command = new GetObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: file,
      });
      const data = await S3.send(command);
      if (!data.Body)
        return send(res, {
          status: 404,
          ...error("not_found"),
          type: 2,
        });
      if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
      (data.Body as NodeJS.ReadableStream).pipe(res);
    } catch (_err: any) {
      return send(res, {
        status: 404,
        ...error("not_found"),
        type: 2,
      });
    }
  });
};
