import { error, msg } from "@/helpers/translate";
import type {
  ICommunityCreatePostDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityPostsDTO,
  ICommunitySuggestionDTO,
} from "../DTOs/ICommunityDTO";
import { CommunityRepository } from "../repositories/CommunityRepository";

export const index = async (data: ICommunityIndexDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const suggest = async (data: ICommunitySuggestionDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.suggest({
    ...data,
    b: {
      theme: data.b.theme.trim(),
    },
  });

  return {
    status: 201,
    ...msg("community_suggestion_created", {}),
    data: res,
  };
};

export const feed = async (data: ICommunityFeedDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.feed(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const posts = async (data: ICommunityPostsDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.posts(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const createPost = async (data: ICommunityCreatePostDTO) => {
  const isAllowedRole = data.auth.role === "paciente" || data.auth.role === "psicologo";

  if (!data.auth.id || !isAllowedRole) {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new CommunityRepository();
  const res = await repository.createPost({
    ...data,
    b: {
      title: data.b.title.trim(),
      content: data.b.content.trim(),
      anonymous: data.auth.role === "paciente" ? data.b.anonymous === true : false,
    },
  });

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 201,
    ...msg("community_post_created", {}),
    data: res,
  };
};

export default index;
