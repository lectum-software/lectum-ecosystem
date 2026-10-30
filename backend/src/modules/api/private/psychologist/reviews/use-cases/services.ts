import { z } from "zod";
import { error, msg } from "@/helpers/translate";
import type {
  IPsychologistReviewIndexDTO,
  IPsychologistReviewRespondDTO,
} from "../DTOs/IReviewDTO";
import { PsychologistReviewRepository } from "../repositories/ReviewRepository";

export const visibility = async (
  data: Pick<IPsychologistReviewRespondDTO, "auth" | "p"> & { b: { hidden: boolean } },
) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;
  if (typeof data.b.hidden !== "boolean") return { status: 400, ...error("invalid_structure", {}) };
  const result = await new PsychologistReviewRepository().setVisibility(
    data.auth.id!,
    data.p.id,
    data.b.hidden,
  );
  if (!result) return { status: 404, ...error("not_found", {}) };
  return { status: 200, ...msg("update", {}), data: result };
};

export const removeResponse = async (data: Pick<IPsychologistReviewRespondDTO, "auth" | "p">) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;
  const result = await new PsychologistReviewRepository().removeResponse(data.auth.id!, data.p.id);
  if (!result) return { status: 404, ...error("not_found", {}) };
  return { status: 200, ...msg("update", {}), data: result };
};

const ensurePsychologist = (data: { auth: { role?: string | null } }) => {
  if (data.auth.role === "psicologo") return null;
  return { status: 403, ...error("role_not_authorized", {}) };
};

const responseSchema = z.object({
  response: z.string().trim().min(3).max(1000),
});

const ensureProfessionalEntitlement = async (
  repository: PsychologistReviewRepository,
  userId?: string | null,
) => {
  if (!userId) return false;
  return repository.hasProfessionalEntitlement(userId);
};

export const index = async (data: IPsychologistReviewIndexDTO) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;

  const repository = new PsychologistReviewRepository();
  const canReceiveReviews = await ensureProfessionalEntitlement(repository, data.auth.id);
  const res = await repository.index(data, { canReceiveReviews });
  return { status: 200, ...msg("index", {}), data: res };
};

export const respond = async (data: IPsychologistReviewRespondDTO) => {
  const unauthorized = ensurePsychologist(data);
  if (unauthorized) return unauthorized;

  const parsed = responseSchema.safeParse(data.b || {});
  if (!parsed.success) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
      data: parsed.error.flatten(),
    };
  }

  const repository = new PsychologistReviewRepository();
  const res = await repository.respond({
    ...data,
    b: parsed.data,
  });

  if (!res) {
    return {
      status: 404,
      ...error("not_found", { model: "professional_review" }),
    };
  }

  return { status: 200, ...msg("professional_review_response_saved", {}), data: res };
};
