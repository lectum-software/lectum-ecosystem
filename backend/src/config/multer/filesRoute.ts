import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { Application, Request, Response } from "express";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Middlewares
import authMiddleware from "@/modules/api/middlewares/_auth";

const getRequestedFile = (file?: string | string[]) => {
  return Array.isArray(file) ? file.join("/") : file;
};

type ObjectHeaders = {
  AcceptRanges?: string;
  CacheControl?: string;
  ContentLength?: number;
  ContentRange?: string;
  ContentType?: string;
  ETag?: string;
  LastModified?: Date;
};

const isAllowedPublicFile = (file: string | undefined) =>
  Boolean(
    file?.startsWith("psychologist/avatar/") ||
      file?.startsWith("psychologist/cover-image/") ||
      file?.startsWith("psychologist/video/") ||
      file?.startsWith("psychologist/video-cover/") ||
      file?.startsWith("patient/avatar/") ||
      file?.startsWith("posts/media/"),
  );

const setObjectResponseHeaders = (res: Response, data: ObjectHeaders) => {
  res.setHeader("Accept-Ranges", "bytes");

  if (data.CacheControl) res.setHeader("Cache-Control", data.CacheControl);
  if (data.ContentLength !== undefined) {
    res.setHeader("Content-Length", String(data.ContentLength));
  }
  if (data.ContentRange) res.setHeader("Content-Range", data.ContentRange);
  if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
  if (data.ETag) res.setHeader("ETag", data.ETag);
  if (data.LastModified) res.setHeader("Last-Modified", data.LastModified.toUTCString());
};

const normalizeRangeHeader = (value: string | undefined) => {
  if (!value?.startsWith("bytes=")) return undefined;

  return value;
};

const sendNotFound = (res: Response) =>
  send(res, {
    status: 404,
    ...error("not_found"),
    type: 2,
  });

const headFile = async (file: string | undefined, res: Response) => {
  if (!file) {
    return sendNotFound(res);
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: file,
    });
    const data = await S3.send(command);

    setObjectResponseHeaders(res, data);
    return res.status(200).end();
  } catch (_err: any) {
    return sendNotFound(res);
  }
};

const streamFile = async (file: string | undefined, req: Request, res: Response) => {
  if (!file) {
    return sendNotFound(res);
  }

  try {
    const range = normalizeRangeHeader(req.headers.range);
    const command = new GetObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: file,
      Range: range,
    });
    const data = await S3.send(command);
    if (!data.Body) {
      return sendNotFound(res);
    }

    setObjectResponseHeaders(res, data);

    if (data.ContentRange) {
      res.status(206);
    }

    (data.Body as NodeJS.ReadableStream).pipe(res);
    return undefined;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 416) {
      res.setHeader("Accept-Ranges", "bytes");
      return res.status(416).end();
    }

    return sendNotFound(res);
  }
};

export const filesRoute = (server: Application) => {
  const handlePublicFileRequest = async (req: Request, res: Response) => {
    const params = req.params as {
      file?: string | string[];
    };
    const file = getRequestedFile(params.file);

    if (!isAllowedPublicFile(file)) {
      return sendNotFound(res);
    }

    return req.method === "HEAD" ? headFile(file, res) : streamFile(file, req, res);
  };

  server.head("/public/files/*file", handlePublicFileRequest);
  server.get("/public/files/*file", handlePublicFileRequest);

  const handlePrivateFileRequest = async (req: Request, res: Response) => {
    const params = req.params as {
      file?: string | string[];
    };
    const file = getRequestedFile(params.file);

    return req.method === "HEAD" ? headFile(file, res) : streamFile(file, req, res);
  };

  server.head("/files/*file", authMiddleware, handlePrivateFileRequest);
  server.get("/files/*file", authMiddleware, handlePrivateFileRequest);
};
