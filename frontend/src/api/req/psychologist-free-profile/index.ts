import { callEndpoint } from "@/api/generator";
import type {
  FreeProfessionalProfile,
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
