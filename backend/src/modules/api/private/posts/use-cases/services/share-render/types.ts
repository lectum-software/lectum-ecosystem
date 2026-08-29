import type { PostShareRenderTargetDTO } from "../../../DTOs/IPostDTO";

export type ShareRenderTarget = PostShareRenderTargetDTO;

export type ShareRenderPayload = Pick<
  ShareRenderTarget,
  "cardLabel" | "professional" | "sourceText"
>;

export type ShareRenderResult = {
  buffer: Buffer;
  contentType: "video/mp4";
  fileName: string;
  sizeBytes: number;
};
