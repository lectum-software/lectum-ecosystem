export type FreeProfileCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type FreeProfessionalProfileAddress = {
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  zip: string | null;
  city: string | null;
  state: string | null;
};

export type FreeProfessionalProfileAcademic = {
  title: string | null;
  institution: string | null;
  graduation_year: string | null;
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
    gender: string | null;
    race_color: string | null;
    religion: string | null;
    whatsapp: string | null;
    whatsapp_url: string | null;
    video_url: string | null;
    target_audience: string[];
    discount_first_session: boolean;
    social_value: boolean;
    accepts_insurance: boolean;
    academic: FreeProfessionalProfileAcademic;
    academic_formations: FreeProfessionalProfileAcademic[];
    available_days: string[];
    address: FreeProfessionalProfileAddress;
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
    service_limit: number;
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
  gender: string | null;
  race_color: string | null;
  religion: string | null;
  crp_region: string | null;
  crp_number: string | null;
  whatsapp: string | null;
  headline: string | null;
  bio: string | null;
  modality: "online" | "presencial" | "hibrido" | null;
  languages: string[];
  target_audience: string[];
  discount_first_session: boolean;
  social_value: boolean;
  accepts_insurance: boolean;
  academic: FreeProfessionalProfileAcademic;
  academic_formations: FreeProfessionalProfileAcademic[];
  available_days: string[];
  address: FreeProfessionalProfileAddress;
  specialty_ids: string[];
  service_ids: string[];
  approach_ids: string[];
  published: boolean;
};

export type FreeProfessionalProfileAvatarUpload = {
  avatar_url: string;
  profile: FreeProfessionalProfile | null;
};
