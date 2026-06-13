import type {
  CommunityFeedResponse,
  CommunityIndexResponse,
  CommunityPostsResponse,
  CommunitySuggestionDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityPostsDTO,
  ICommunitySuggestionDTO,
} from "../../DTOs/ICommunityDTO";

export interface ICommunityRepository {
  index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse>;
  feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse>;
  posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null>;
  suggest(data: ICommunitySuggestionDTO): Promise<CommunitySuggestionDTO>;
}
