import type { Metadata } from "next";
import { ReviewsNewLogic } from "@/app/app/reviews/new/logic";
import { resolvePsychologistReviewSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> => {
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const id = first(query.psychologist_id) || first(query.id);
  return resolvePsychologistReviewSeoMetadata(id);
};

export default function ReviewsNewPage() {
  return <ReviewsNewLogic />;
}
