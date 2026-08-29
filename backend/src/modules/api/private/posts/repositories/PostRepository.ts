import type { IPostRepository } from "./interfaces/IPostRepository";
import { PostCoreRepository } from "./queries/PostCoreRepository";
import { PostEngagementRepository } from "./queries/PostEngagementRepository";
import { PostListRepository } from "./queries/PostListRepository";
import { PostReplyRepository } from "./queries/PostReplyRepository";
import { PostReplyStateRepository } from "./queries/PostReplyStateRepository";
import { PostShareArtifactRepository } from "./queries/PostShareArtifactRepository";
import { PostShareRenderRepository } from "./queries/PostShareRenderRepository";
import { PostStateRepository } from "./queries/PostStateRepository";
import { PostUpdateRepository } from "./queries/PostUpdateRepository";

export class PostRepository implements IPostRepository {
  private readonly coreRepository = new PostCoreRepository();

  private readonly listRepository = new PostListRepository();

  private readonly replyRepository = new PostReplyRepository(this.coreRepository);

  private readonly updateRepository = new PostUpdateRepository(this.coreRepository);

  private readonly engagementRepository = new PostEngagementRepository();

  private readonly stateRepository = new PostStateRepository();

  private readonly replyStateRepository = new PostReplyStateRepository();

  private readonly shareArtifactRepository = new PostShareArtifactRepository();

  private readonly shareRenderRepository = new PostShareRenderRepository();

  exists(
    ...args: Parameters<PostCoreRepository["exists"]>
  ): ReturnType<PostCoreRepository["exists"]> {
    return this.coreRepository.exists(...args);
  }

  canAttachReplyMedia(
    ...args: Parameters<PostCoreRepository["canAttachReplyMedia"]>
  ): ReturnType<PostCoreRepository["canAttachReplyMedia"]> {
    return this.coreRepository.canAttachReplyMedia(...args);
  }

  show(...args: Parameters<PostCoreRepository["show"]>): ReturnType<PostCoreRepository["show"]> {
    return this.coreRepository.show(...args);
  }

  mine(...args: Parameters<PostListRepository["mine"]>): ReturnType<PostListRepository["mine"]> {
    return this.listRepository.mine(...args);
  }

  saved(...args: Parameters<PostListRepository["saved"]>): ReturnType<PostListRepository["saved"]> {
    return this.listRepository.saved(...args);
  }

  replies(
    ...args: Parameters<PostReplyRepository["replies"]>
  ): ReturnType<PostReplyRepository["replies"]> {
    return this.replyRepository.replies(...args);
  }

  replyThread(
    ...args: Parameters<PostReplyRepository["replyThread"]>
  ): ReturnType<PostReplyRepository["replyThread"]> {
    return this.replyRepository.replyThread(...args);
  }

  createReply(
    ...args: Parameters<PostReplyRepository["createReply"]>
  ): ReturnType<PostReplyRepository["createReply"]> {
    return this.replyRepository.createReply(...args);
  }

  updatePost(
    ...args: Parameters<PostUpdateRepository["updatePost"]>
  ): ReturnType<PostUpdateRepository["updatePost"]> {
    return this.updateRepository.updatePost(...args);
  }

  updateReply(
    ...args: Parameters<PostUpdateRepository["updateReply"]>
  ): ReturnType<PostUpdateRepository["updateReply"]> {
    return this.updateRepository.updateReply(...args);
  }

  report(
    ...args: Parameters<PostEngagementRepository["report"]>
  ): ReturnType<PostEngagementRepository["report"]> {
    return this.engagementRepository.report(...args);
  }

  share(
    ...args: Parameters<PostEngagementRepository["share"]>
  ): ReturnType<PostEngagementRepository["share"]> {
    return this.engagementRepository.share(...args);
  }

  vote(
    ...args: Parameters<PostEngagementRepository["vote"]>
  ): ReturnType<PostEngagementRepository["vote"]> {
    return this.engagementRepository.vote(...args);
  }

  save(...args: Parameters<PostStateRepository["save"]>): ReturnType<PostStateRepository["save"]> {
    return this.stateRepository.save(...args);
  }

  unsave(
    ...args: Parameters<PostStateRepository["unsave"]>
  ): ReturnType<PostStateRepository["unsave"]> {
    return this.stateRepository.unsave(...args);
  }

  mute(...args: Parameters<PostStateRepository["mute"]>): ReturnType<PostStateRepository["mute"]> {
    return this.stateRepository.mute(...args);
  }

  unmute(
    ...args: Parameters<PostStateRepository["unmute"]>
  ): ReturnType<PostStateRepository["unmute"]> {
    return this.stateRepository.unmute(...args);
  }

  deletePost(
    ...args: Parameters<PostStateRepository["deletePost"]>
  ): ReturnType<PostStateRepository["deletePost"]> {
    return this.stateRepository.deletePost(...args);
  }

  saveReply(
    ...args: Parameters<PostReplyStateRepository["saveReply"]>
  ): ReturnType<PostReplyStateRepository["saveReply"]> {
    return this.replyStateRepository.saveReply(...args);
  }

  unsaveReply(
    ...args: Parameters<PostReplyStateRepository["unsaveReply"]>
  ): ReturnType<PostReplyStateRepository["unsaveReply"]> {
    return this.replyStateRepository.unsaveReply(...args);
  }

  deleteReply(
    ...args: Parameters<PostReplyStateRepository["deleteReply"]>
  ): ReturnType<PostReplyStateRepository["deleteReply"]> {
    return this.replyStateRepository.deleteReply(...args);
  }

  listExpiredShareArtifacts(
    ...args: Parameters<PostShareArtifactRepository["listExpired"]>
  ): ReturnType<PostShareArtifactRepository["listExpired"]> {
    return this.shareArtifactRepository.listExpired(...args);
  }

  markShareArtifactDeleted(
    ...args: Parameters<PostShareArtifactRepository["markDeleted"]>
  ): ReturnType<PostShareArtifactRepository["markDeleted"]> {
    return this.shareArtifactRepository.markDeleted(...args);
  }

  findShareRenderTarget(
    ...args: Parameters<PostShareRenderRepository["findTarget"]>
  ): ReturnType<PostShareRenderRepository["findTarget"]> {
    return this.shareRenderRepository.findTarget(...args);
  }
}
