import type { Resolve } from "@/helpers/return";
import { msg } from "@/helpers/translate";
import { SeoMetadataRepository } from "@/modules/seo/repositories/SeoMetadataRepository";

export const index = async (): Promise<Resolve> => {
  const repository = new SeoMetadataRepository();

  return {
    status: 200,
    ...msg("index", {}),
    data: await repository.list(),
  };
};
