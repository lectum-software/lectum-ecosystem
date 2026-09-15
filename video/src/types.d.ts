declare namespace Express {
  interface Request {
    videoJobId?: string;
    videoTraceId?: string;
    videoUploadAccepted?: boolean;
    videoStorageReserved?: boolean;
  }
}
