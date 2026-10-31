import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import type { PendingTestimonialsResponse } from "./types";

export const getPendingTestimonials = async (page = 1, batch?: string) =>
  handleReq<PendingTestimonialsResponse>(
    callEndpoint({
      route: "/api/private/user/reviews/pending",
      query: { page, limit: 20, ...(batch ? { batch } : {}) },
    }),
  );
