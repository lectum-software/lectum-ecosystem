import { Repository } from "./Repository";

export type ErrorType = "HIDRATE";

export const emitError = async (
  entity: { id: string; device_id?: string }[],
  type: ErrorType,
  data?: unknown,
) => {
  const backgroundRepository = new Repository();

  await backgroundRepository.create({
    entity,
    type,
    data: data === undefined ? undefined : JSON.stringify(data),
  });
};

export const destroyAsync = async (ids: string[], type: ErrorType) => {
  const backgroundRepository = new Repository();
  await backgroundRepository.delete({ ids, type });
};
