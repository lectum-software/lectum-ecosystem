import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminPsychologistPersonalDataInput = {
  address_city?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_number?: string | null;
  address_state?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  birthdate?: string | null;
  confirm_cpf_change?: boolean;
  cpf?: string | null;
  gender?: string | null;
  race_color?: string | null;
  reason: string;
  religion?: string | null;
  whatsapp?: string | null;
};

export type AdminPsychologistProfessionalDataInput = {
  approach_ids?: string[];
  languages?: string[];
  modality?: "hibrido" | "online" | "presencial" | null;
  reason?: string | null;
  service_ids?: string[];
  specialty_ids?: string[];
  target_audience?: string[];
};

export type IAdminPsychologistUpdatePersonalDataDTO = Request & {
  admin?: admin;
  b: AdminPsychologistPersonalDataInput;
  p: {
    id: string;
  };
};

export type IAdminPsychologistUpdateProfessionalDataDTO = Request & {
  admin?: admin;
  b: AdminPsychologistProfessionalDataInput;
  p: {
    id: string;
  };
};
