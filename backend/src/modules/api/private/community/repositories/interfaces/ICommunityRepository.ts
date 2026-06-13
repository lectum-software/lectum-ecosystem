import type {
  CommunityDetailResponse,
  CommunityFeedResponse,
  CommunityIndexResponse,
  CommunityMembershipResponse,
  CommunityPostDTO,
  CommunityPostsResponse,
  CommunitySuggestionDTO,
  CommunityTopMentorsResponse,
  ICommunityCreatePostDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityMembershipDTO,
  ICommunityPostsDTO,
  ICommunityShowDTO,
  ICommunitySuggestionDTO,
  ICommunityTopMentorsDTO,
} from "../../DTOs/ICommunityDTO";

export interface ICommunityRepository {
  index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse>;
  show(data: ICommunityShowDTO): Promise<CommunityDetailResponse | null>;
  feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse>;
  topMentors(data: ICommunityTopMentorsDTO): Promise<CommunityTopMentorsResponse | null>;
  posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null>;
  createPost(data: ICommunityCreatePostDTO): Promise<CommunityPostDTO | null>;
  follow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null>;
  unfollow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null>;
  suggest(data: ICommunitySuggestionDTO): Promise<CommunitySuggestionDTO>;
}
