import type {
  CommunityIndexResponse,
  CommunityPostsResponse,
  CommunitySuggestionDTO,
  ICommunityIndexDTO,
  ICommunityPostsDTO,
  ICommunitySuggestionDTO,
} from "../../DTOs/ICommunityDTO";

export interface ICommunityRepository {
  index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse>;
  posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null>;
  suggest(data: ICommunitySuggestionDTO): Promise<CommunitySuggestionDTO>;
}
