import { createHmac, timingSafeEqual } from "node:crypto";
import type { VerifyWebhookSignatureInput } from "./PaymentGateway";

const firstHeaderValue = (value?: string | string[]) => {
  if (Array.isArray(value)) return value.length === 1 ? value[0] : undefined;
  return value;
};

const parseSignatureHeader = (signature?: string | string[]) => {
  const header = firstHeaderValue(signature);
  if (!header || header.length > 512) return null;
  const fields = new Map<string, string>();
  for (const item of header.split(/[;,]/)) {
    const match = /^\s*(ts|v1)\s*=\s*([^=]+?)\s*$/.exec(item);
    if (!match || fields.has(match[1])) return null;
    fields.set(match[1], match[2]);
  }
  return fields;
};

export const verifyMercadoPagoWebhookSignature = ({
  signature,
  requestId,
  dataId,
  secret,
}: VerifyWebhookSignatureInput & { secret?: string | null }): boolean => {
  if (!secret || !dataId) return false;
  const fields = parseSignatureHeader(signature);
  const ts = fields?.get("ts");
  const signatureV1 = fields?.get("v1");
  const requestIdValue = firstHeaderValue(requestId);
  if (
    !ts ||
    !/^\d{1,16}$/.test(ts) ||
    !signatureV1 ||
    !/^[a-f0-9]{64}$/i.test(signatureV1) ||
    !requestIdValue
  )
    return false;

  const manifest = `id:${dataId};request-id:${requestIdValue};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(signatureV1, "hex"));
};
