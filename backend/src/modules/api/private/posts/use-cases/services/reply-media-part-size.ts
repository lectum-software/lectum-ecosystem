import { getPublicMultipartExpectedPartSize } from "@/config/multer/public-multipart";

export const isReplyMediaPartSizeValid = (
  session: { size: number; chunkSize: number },
  partNumber: number,
  receivedBytes: number,
) => {
  if (
    !Number.isSafeInteger(session.size) ||
    session.size <= 0 ||
    !Number.isSafeInteger(session.chunkSize) ||
    session.chunkSize <= 0
  )
    return false;
  const expected = getPublicMultipartExpectedPartSize(session.size, partNumber, session.chunkSize);
  return expected !== null && receivedBytes === expected;
};
