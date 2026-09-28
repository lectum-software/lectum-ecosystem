import { buildProfessionalFullDisplayName } from "./professional-name";

type MentorIdentity = {
  id: string;
  name?: string | null;
  psychologist_profile?: {
    professional_first_name?: string | null;
    professional_last_name?: string | null;
  } | null;
};

const displayName = (mentor: MentorIdentity) =>
  buildProfessionalFullDisplayName({
    fallbackName: mentor.name,
    firstName: mentor.psychologist_profile?.professional_first_name,
    lastName: mentor.psychologist_profile?.professional_last_name,
  });

// Used only after every score and activity criterion is tied.
export const compareCommunityMentorIdentity = (a: MentorIdentity, b: MentorIdentity) =>
  displayName(a).localeCompare(displayName(b), "pt-BR") || a.id.localeCompare(b.id);
