import { error } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import { FreeProfileRepository } from "../../repositories/FreeProfileRepository";
import {
  paidRegistryVerificationRequired,
  requiresPaidRegistryVerification,
} from "./profile-validation";

export const resolveProfileVideoAccess = async (auth: user) => {
  if (auth.role !== "psicologo") {
    return {
      allowed: false as const,
      response: {
        status: 403,
        ...error("role_not_authorized", {}),
      },
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(auth.id!);

  if (!current) {
    return {
      allowed: false as const,
      response: {
        status: 404,
        ...error("not_found", { model: "psychologist_profile" }),
      },
    };
  }

  if (requiresPaidRegistryVerification(current)) {
    return { allowed: false as const, response: paidRegistryVerificationRequired() };
  }

  if (!current.plan.can_upload_video) {
    return {
      allowed: false as const,
      response: {
        status: 403,
        ...error("profile_video_professional_plan", {}),
      },
    };
  }

  return { allowed: true as const, current, repository };
};
