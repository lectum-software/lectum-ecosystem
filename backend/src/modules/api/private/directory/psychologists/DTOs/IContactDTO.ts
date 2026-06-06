import type { user } from "@/interfaces/objects";

export type DirectoryPsychologistContactResponse = {
  contact_request_id: string;
  psychologist_id: string;
  whatsapp_url: string;
};

export interface IContactDTO {
  p: {
    id: string;
  };
  b: {
    patient_phone: string;
    consent_accepted: boolean;
  };
  auth: user;
}
