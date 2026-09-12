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
import { deleteVideoAsset } from "@/api/req/video-assets";
import { withProfileVideoFileType } from "@/utils/profile-video-upload";
import { uploadVideoAsset } from "@/utils/video-asset-upload";
import { videoAssetIdFromReference } from "@/utils/video-stream";

const route = "/api/private/psychologist/free-profile";

export const getPsychologistFreeProfile = async () => {
  const handle = callEndpoint({ route });
  return handleReq<FreeProfessionalProfile>(handle);
};

export const updatePsychologistFreeProfile = async (body: FreeProfessionalProfilePayload) => {
  const handle = callEndpoint({ route, method: "PUT", body });
  return handleReq<FreeProfessionalProfile>({ ...handle, hideError: true });
};

export const uploadPsychologistFreeProfileAvatar = async (file: File) => {
  const body = new FormData();
  body.append("avatar", file);

  const handle = callEndpoint({ route: `${route}/avatar`, method: "POST", body });
  return handleReq<FreeProfessionalProfileAvatarUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileAvatar = async () => {
  const handle = callEndpoint({ route: `${route}/avatar`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileAvatarRemoval>({ ...handle, hideError: true });
};

export const uploadPsychologistFreeProfileCoverImage = async (file: File) => {
  const body = new FormData();
  body.append("cover-image", file);

  const handle = callEndpoint({ route: `${route}/cover-image`, method: "POST", body });
  return handleReq<FreeProfessionalProfileCoverImageUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileCoverImage = async () => {
  const handle = callEndpoint({ route: `${route}/cover-image`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileCoverImageRemoval>({ ...handle, hideError: true });
};

export const uploadPsychologistFreeProfileVideo = async (
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  const { file: uploadFile } = withProfileVideoFileType(file);
  const uploaded = await uploadVideoAsset({
    file: uploadFile,
    onProgress,
    purpose: "profile_presentation",
    signal,
  });
  const profile = await getPsychologistFreeProfile();

  return {
    profile,
    video_url: uploaded.media_url,
  } satisfies FreeProfessionalProfileVideoUpload;
};

export const uploadPsychologistFreeProfileVideoCover = async (file: File) => {
  const body = new FormData();
  body.append("video-cover", file);

  const handle = callEndpoint({ route: `${route}/video/cover`, method: "POST", body });
  return handleReq<FreeProfessionalProfileVideoCoverUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileVideo = async () => {
  const current = await getPsychologistFreeProfile();
  const assetId = videoAssetIdFromReference(current.profile.video_url);
  const handle = callEndpoint({ route: `${route}/video`, method: "DELETE" });
  const removed = await handleReq<FreeProfessionalProfileVideoRemoval>({
    ...handle,
    hideError: true,
  });
  if (assetId) {
    await deleteVideoAsset(assetId).catch(() => undefined);
  }
  return removed;
};
