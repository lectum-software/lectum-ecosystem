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

export type FreeProfessionalProfileActivationPendingField = {
  key: string;
  label: string;
};

export type FreeProfessionalProfileActivation = {
  active: boolean;
  pending_fields: FreeProfessionalProfileActivationPendingField[];
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
    cover_image_url: string | null;
    video_url: string | null;
    video_cover_url: string | null;
    target_audience: string[];
    discount_first_session: boolean;
    social_value: boolean;
    accepts_insurance: boolean;
    show_experience_tag: boolean;
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
    approach_limit: number;
    can_upload_video: boolean;
    current_period_end: string | null;
    is_courtesy: boolean;
    slug: string | null;
    is_free: boolean;
    service_limit: number;
    source: string | null;
    specialty_limit: number;
  };
  selected: {
    specialties: FreeProfileCatalogItem[];
    services: FreeProfileCatalogItem[];
    approaches: FreeProfileCatalogItem[];
  };
  activation: FreeProfessionalProfileActivation;
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
  show_experience_tag: boolean;
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

export type FreeProfessionalProfileAvatarRemoval = {
  profile: FreeProfessionalProfile | null;
};

export type FreeProfessionalProfileVideoUpload = {
  video_url: string;
  profile: FreeProfessionalProfile | null;
};

export type FreeProfessionalProfileVideoCoverUpload = {
  video_cover_url: string;
  profile: FreeProfessionalProfile | null;
};

export type FreeProfessionalProfileCoverImageUpload = {
  cover_image_url: string;
  profile: FreeProfessionalProfile | null;
};

export type FreeProfessionalProfileCoverImageRemoval = {
  profile: FreeProfessionalProfile | null;
};

export type FreeProfessionalProfileVideoRemoval = {
  profile: FreeProfessionalProfile | null;
};
