export type FreeProfileCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type FreeProfessionalProfile = {
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
    cfp_verified_at: string | null;
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

export type FreeProfessionalProfilePayload = {
  name: string;
  cpf: string | null;
  crp_region: string | null;
  crp_number: string | null;
  whatsapp: string | null;
  headline: string | null;
  bio: string | null;
  modality: "online" | "presencial" | "hibrido" | null;
  languages: string[];
  specialty_ids: string[];
  service_ids: string[];
  approach_ids: string[];
  published: boolean;
};
