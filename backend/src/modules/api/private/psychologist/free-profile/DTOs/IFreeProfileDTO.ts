import type { user } from "@/interfaces/objects";

export type FreeProfileCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type FreeProfessionalProfileResponse = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  profile: {
    id: string;
    headline: string | null;
    bio: string | null;
    modality: string | null;
    languages: string[];
    cpf: string | null;
    whatsapp: string | null;
    whatsapp_url: string | null;
    published: boolean;
    crp: string | null;
    crp_region: string | null;
    crp_number: string | null;
    crp_status: string | null;
    cfp_verified_at: Date | null;
  };
  plan: {
    slug: string | null;
    is_free: boolean;
    specialty_limit: number;
  };
  selected: {
    specialties: FreeProfileCatalogItem[];
    services: FreeProfileCatalogItem[];
    approaches: FreeProfileCatalogItem[];
  };
  catalogs: {
    specialties: FreeProfileCatalogItem[];
    services: FreeProfileCatalogItem[];
    approaches: FreeProfileCatalogItem[];
  };
};

export type FreeProfessionalProfileUpdateBody = {
  name?: string;
  cpf?: string | null;
  crp_region?: string | null;
  crp_number?: string | null;
  whatsapp?: string | null;
  headline?: string | null;
  bio?: string | null;
  modality?: "online" | "presencial" | "hibrido" | null;
  languages?: string[];
  specialty_ids?: string[];
  service_ids?: string[];
  approach_ids?: string[];
  published?: boolean;
};

export interface IFreeProfessionalProfileShowDTO {
  auth: user;
}

export interface IFreeProfessionalProfileUpdateDTO {
  auth: user;
  b: FreeProfessionalProfileUpdateBody;
}
