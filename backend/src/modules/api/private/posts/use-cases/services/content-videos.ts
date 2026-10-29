import { msg } from "@/helpers/translate";
import type { IPostContentVideosDTO } from "../../DTOs/IPostContentVideoDTO";
import { PostContentVideoRepository } from "../../repositories/queries/PostContentVideoRepository";
import { notFound } from "./post-support";

export const contentVideos = async (data: IPostContentVideosDTO) => {
  const result = await new PostContentVideoRepository().list(data);
  if (!result) return notFound();
  return { status: 200, ...msg("index", {}), data: result };
};
