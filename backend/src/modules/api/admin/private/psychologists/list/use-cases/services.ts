import type { Resolve } from "@/helpers/return";
import type { IAdminPsychologistsListDTO } from "../DTOs/IAdminPsychologistsListDTO";
import { listAdminPsychologists } from "./services/list-builder";

export default async (data: IAdminPsychologistsListDTO): Promise<Resolve> => {
  return listAdminPsychologists(data.q ?? {});
};

export { listAdminPsychologists } from "./services/list-builder";
