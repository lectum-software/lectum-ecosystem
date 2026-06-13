import type {
  CommunityFeedResponse,
  CommunityIndexResponse,
  CommunityPostDTO,
  CommunityPostsResponse,
  CommunitySuggestionDTO,
  ICommunityCreatePostDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityPostsDTO,
  ICommunitySuggestionDTO,
} from "../../DTOs/ICommunityDTO";

export interface ICommunityRepository {
  index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse>;
  feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse>;
  posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null>;
  createPost(data: ICommunityCreatePostDTO): Promise<CommunityPostDTO | null>;
  suggest(data: ICommunitySuggestionDTO): Promise<CommunitySuggestionDTO>;
}
