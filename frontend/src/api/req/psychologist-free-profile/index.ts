import { callEndpoint } from "@/api/generator";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfileAvatarRemoval,
  FreeProfessionalProfileAvatarUpload,
  FreeProfessionalProfilePayload,
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
