import type {
  IPostContentVideosDTO,
  PostContentVideosResponse,
} from "../../DTOs/IPostContentVideoDTO";

export interface IPostContentVideoRepository {
  list(data: IPostContentVideosDTO): Promise<PostContentVideosResponse | null>;
}
