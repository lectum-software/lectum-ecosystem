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

export type CommunityPostCreationOptions = {
  status?: "bloqueado" | "publicado";
};

export interface ICommunityRepository {
  existsBySlug(slug: string): Promise<boolean>;
  index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse>;
  show(data: ICommunityShowDTO): Promise<CommunityDetailResponse | null>;
  feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse>;
  topMentors(data: ICommunityTopMentorsDTO): Promise<CommunityTopMentorsResponse | null>;
  posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null>;
  createPost(
    data: ICommunityCreatePostDTO,
    options?: CommunityPostCreationOptions,
  ): Promise<CommunityPostDTO | null>;
  follow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null>;
  unfollow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null>;
  suggest(data: ICommunitySuggestionDTO): Promise<CommunitySuggestionDTO>;
}
