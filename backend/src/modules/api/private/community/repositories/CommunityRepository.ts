import type { ICommunityRepository } from "./interfaces/ICommunityRepository";
import { CommunityCoreRepository } from "./queries/CommunityCoreRepository";
import { CommunityMembershipRepository } from "./queries/CommunityMembershipRepository";
import { CommunityMentorRepository } from "./queries/CommunityMentorRepository";
import { CommunityPostRepository } from "./queries/CommunityPostRepository";

export class CommunityRepository implements ICommunityRepository {
  private readonly coreRepository = new CommunityCoreRepository();

  private readonly mentorRepository = new CommunityMentorRepository();

  private readonly postRepository = new CommunityPostRepository();

  private readonly membershipRepository = new CommunityMembershipRepository();

  existsBySlug(
    ...args: Parameters<CommunityCoreRepository["existsBySlug"]>
  ): ReturnType<CommunityCoreRepository["existsBySlug"]> {
    return this.coreRepository.existsBySlug(...args);
  }

  index(
    ...args: Parameters<CommunityCoreRepository["index"]>
  ): ReturnType<CommunityCoreRepository["index"]> {
    return this.coreRepository.index(...args);
  }

  show(
    ...args: Parameters<CommunityCoreRepository["show"]>
  ): ReturnType<CommunityCoreRepository["show"]> {
    return this.coreRepository.show(...args);
  }

  feed(
    ...args: Parameters<CommunityCoreRepository["feed"]>
  ): ReturnType<CommunityCoreRepository["feed"]> {
    return this.coreRepository.feed(...args);
  }

  topMentors(
    ...args: Parameters<CommunityMentorRepository["topMentors"]>
  ): ReturnType<CommunityMentorRepository["topMentors"]> {
    return this.mentorRepository.topMentors(...args);
  }

  posts(
    ...args: Parameters<CommunityPostRepository["posts"]>
  ): ReturnType<CommunityPostRepository["posts"]> {
    return this.postRepository.posts(...args);
  }

  createPost(
    ...args: Parameters<CommunityPostRepository["createPost"]>
  ): ReturnType<CommunityPostRepository["createPost"]> {
    return this.postRepository.createPost(...args);
  }

  follow(
    ...args: Parameters<CommunityMembershipRepository["follow"]>
  ): ReturnType<CommunityMembershipRepository["follow"]> {
    return this.membershipRepository.follow(...args);
  }

  unfollow(
    ...args: Parameters<CommunityMembershipRepository["unfollow"]>
  ): ReturnType<CommunityMembershipRepository["unfollow"]> {
    return this.membershipRepository.unfollow(...args);
  }

  suggest(
    ...args: Parameters<CommunityMembershipRepository["suggest"]>
  ): ReturnType<CommunityMembershipRepository["suggest"]> {
    return this.membershipRepository.suggest(...args);
  }
}
