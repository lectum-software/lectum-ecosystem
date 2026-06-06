import { callEndpoint } from "@/api/generator";
import type {
  DirectoryPsychologistsQuery,
  DirectoryPsychologistsResponse,
} from "@/api/generator/types/directory";
import { handleReq } from "@/api/handle";

export const getDirectoryPsychologists = async (query: DirectoryPsychologistsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/directory/psychologists",
    query,
  });

  return handleReq<DirectoryPsychologistsResponse>(handle);
};
