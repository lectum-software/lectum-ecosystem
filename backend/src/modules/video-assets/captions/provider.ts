import { parse } from "node-webvtt";
import { z } from "zod";
import { getVideoStreamApiConfig, isCloudflareStreamVideoUid } from "@/infra/video-stream";
import { captionCuesSchema } from "./policy";

const stateSchema = z.object({
  success: z.literal(true),
  result: z.object({
    status: z.enum(["inprogress", "ready", "error"]),
    language: z.literal("pt"),
  }),
});

export async function requestCaption(
  uid: string,
  action: "generate" | "status" | "vtt",
  fetcher = fetch,
) {
  const config = getVideoStreamApiConfig();
  if (!config || !isCloudflareStreamVideoUid(uid)) throw new Error("CAPTION_PROVIDER_UNAVAILABLE");
  const suffix = action === "status" ? "" : `/${action}`;
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/${uid}/captions/pt${suffix}`,
    {
      method: action === "generate" ? "POST" : "GET",
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      redirect: "error",
    },
  );
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("CAPTION_PROVIDER_UNAVAILABLE");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024) throw new Error("CAPTION_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export const parseCaptionStatus = (text: string) =>
  stateSchema.parse(JSON.parse(text)).result.status;
export const parseCaptionVtt = (text: string) => {
  const parsed = parse(text, { strict: true });
  if (!parsed.valid) throw new Error("CAPTION_INVALID");
  return captionCuesSchema.parse(
    parsed.cues.map(({ start, end, text: cueText }) => ({ start, end, text: cueText })),
  );
};
