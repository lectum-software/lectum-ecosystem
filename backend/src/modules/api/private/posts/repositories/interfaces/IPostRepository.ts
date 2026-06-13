import type {
  IPostCreateReplyDTO,
  IPostRepliesDTO,
  IPostSaveDTO,
  IPostShowDTO,
  IPostVoteDTO,
  PostDetailResponse,
  PostMutationResult,
  PostRepliesResponse,
  PostReplyDTO,
  PostSaveResponse,
  PostVoteResponse,
} from "../../DTOs/IPostDTO";

export interface IPostRepository {
  show(data: IPostShowDTO): Promise<PostDetailResponse | null>;
  replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null>;
  createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>>;
  vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>>;
  save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
}
