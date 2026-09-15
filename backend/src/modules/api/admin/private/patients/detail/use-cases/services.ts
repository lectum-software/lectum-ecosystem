import type { Resolve } from "@/helpers/return";
import type { IAdminPatientDetailDTO } from "../DTOs/IAdminPatientDetailDTO";
import { showAdminPatient } from "./services/detail-builder";

export default async (data: IAdminPatientDetailDTO): Promise<Resolve> => {
  return showAdminPatient(data);
};

export { showAdminPatient } from "./services/detail-builder";
