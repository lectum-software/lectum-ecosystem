import type { user } from "@/interfaces/objects";

export type DirectoryPsychologistContactResponse = {
  contact_request_id: string | null;
  psychologist_id: string;
  tracked: boolean;
  whatsapp_url: string;
};

export interface IContactDTO {
  p: {
    id: string;
  };
  b: {
    patient_phone: string;
    consent_accepted: boolean;
    visitor_id?: string;
  };
  auth?: user;
}

export interface IContactClickDTO {
  b?: { visitor_id?: string };
  p: {
    id: string;
  };
  auth?: user;
}
