import type {
  IPostCreateReplyDTO,
  IPostMineDTO,
  IPostRepliesDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShowDTO,
  IPostVoteDTO,
  PostDetailResponse,
  PostListResponse,
  PostMutationResult,
  PostRepliesResponse,
  PostReplyDTO,
  PostSaveResponse,
  PostVoteResponse,
} from "../../DTOs/IPostDTO";

export interface IPostRepository {
  mine(data: IPostMineDTO): Promise<PostListResponse>;
  saved(data: IPostSavedDTO): Promise<PostListResponse>;
  show(data: IPostShowDTO): Promise<PostDetailResponse | null>;
  replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null>;
  createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>>;
  vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>>;
  save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
}
