import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminPatientPersonalDataInput = {
  display_name?: string;
  gender?: string | null;
  reason: string;
};

export type IAdminPatientUpdatePersonalDataDTO = Request & {
  admin?: admin;
  b: AdminPatientPersonalDataInput;
  p: {
    id: string;
  };
};
