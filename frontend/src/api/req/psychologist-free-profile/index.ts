import { callEndpoint } from "@/api/generator";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfileAvatarRemoval,
  FreeProfessionalProfileAvatarUpload,
  FreeProfessionalProfileCoverImageRemoval,
  FreeProfessionalProfileCoverImageUpload,
  FreeProfessionalProfilePayload,
  FreeProfessionalProfileVideoCoverUpload,
  FreeProfessionalProfileVideoRemoval,
  FreeProfessionalProfileVideoUpload,
} from "@/api/generator/types/free-profile";
import { handleReq } from "@/api/handle";

const route = "/api/private/psychologist/free-profile";

export const getPsychologistFreeProfile = async () => {
  const handle = callEndpoint({ route });
  return handleReq<FreeProfessionalProfile>(handle);
};

export const updatePsychologistFreeProfile = async (body: FreeProfessionalProfilePayload) => {
  const handle = callEndpoint({ route, method: "PUT", body });
  return handleReq<FreeProfessionalProfile>(handle);
};

export const uploadPsychologistFreeProfileAvatar = async (file: File) => {
  const body = new FormData();
  body.append("avatar", file);

  const handle = callEndpoint({ route: `${route}/avatar`, method: "POST", body });
  return handleReq<FreeProfessionalProfileAvatarUpload>(handle);
};

export const deletePsychologistFreeProfileAvatar = async () => {
  const handle = callEndpoint({ route: `${route}/avatar`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileAvatarRemoval>(handle);
};

export const uploadPsychologistFreeProfileCoverImage = async (file: File) => {
  const body = new FormData();
  body.append("cover-image", file);

  const handle = callEndpoint({ route: `${route}/cover-image`, method: "POST", body });
  return handleReq<FreeProfessionalProfileCoverImageUpload>(handle);
};

export const deletePsychologistFreeProfileCoverImage = async () => {
  const handle = callEndpoint({ route: `${route}/cover-image`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileCoverImageRemoval>(handle);
};

export const uploadPsychologistFreeProfileVideo = async (file: File) => {
  const body = new FormData();
  body.append("video", file);

  const handle = callEndpoint({ route: `${route}/video`, method: "POST", body });
  return handleReq<FreeProfessionalProfileVideoUpload>(handle);
};

export const uploadPsychologistFreeProfileVideoCover = async (file: File) => {
  const body = new FormData();
  body.append("video-cover", file);

  const handle = callEndpoint({ route: `${route}/video/cover`, method: "POST", body });
  return handleReq<FreeProfessionalProfileVideoCoverUpload>(handle);
};

export const deletePsychologistFreeProfileVideo = async () => {
  const handle = callEndpoint({ route: `${route}/video`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileVideoRemoval>(handle);
};
