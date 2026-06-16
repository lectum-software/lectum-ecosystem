import type {
  IPostCreateReplyDTO,
  IPostMineDTO,
  IPostRepliesDTO,
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  IPostReplyThreadDTO,
  IPostReportDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShowDTO,
  IPostVoteDTO,
  PostDetailResponse,
  PostListResponse,
  PostMutationResult,
  PostRepliesResponse,
  PostReplyDeleteResponse,
  PostReplyDTO,
  PostReportResponse,
  PostSaveResponse,
  PostVoteResponse,
} from "../../DTOs/IPostDTO";

export interface IPostRepository {
  canAttachReplyMedia(userId: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  mine(data: IPostMineDTO): Promise<PostListResponse>;
  saved(data: IPostSavedDTO): Promise<PostListResponse>;
  show(data: IPostShowDTO): Promise<PostDetailResponse | null>;
  replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null>;
  replyThread(data: IPostReplyThreadDTO): Promise<PostReplyDTO | null>;
  createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>>;
  report(data: IPostReportDTO): Promise<PostMutationResult<PostReportResponse>>;
  vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>>;
  save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  saveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  unsaveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>>;
  deleteReply(data: IPostReplyDeleteDTO): Promise<PostMutationResult<PostReplyDeleteResponse>>;
}
