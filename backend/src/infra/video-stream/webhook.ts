import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

const parseSignature = (headerValue?: string | string[]) => {
  const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!header) return null;

  const parts = new Map(
    header.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")] as const;
    }),
  );
  const timestamp = Number(parts.get("time"));
  const signature = parts.get("sig1")?.trim().toLowerCase() ?? "";

  if (!Number.isInteger(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  return { signature, timestamp };
};

export const verifyVideoStreamWebhook = ({
  body,
  header,
  now = Date.now(),
  secret,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: {
  body: Buffer;
  header?: string | string[];
  now?: number;
  secret: string;
  toleranceSeconds?: number;
}) => {
  const parsed = parseSignature(header);
  if (!parsed || !secret || !Buffer.isBuffer(body)) return false;

  const ageSeconds = Math.abs(Math.floor(now / 1_000) - parsed.timestamp);
  if (ageSeconds > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(String(parsed.timestamp))
    .update(".")
    .update(body)
    .digest();
  const received = Buffer.from(parsed.signature, "hex");

  return expected.length === received.length && timingSafeEqual(expected, received);
};
