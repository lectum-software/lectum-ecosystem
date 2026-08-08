import type {
  AdminPostReportRecord,
  AdminUncoveredPatientPostRecord,
} from "../../repositories/interfaces/IAdminModerationRepository";

export const communityDTO = (
  community:
    | AdminPostReportRecord["post"]["community"]
    | AdminUncoveredPatientPostRecord["community"],
) => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
});
