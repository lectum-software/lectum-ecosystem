import type { user } from "@/interfaces/objects";

export type FreeProfileCatalogItem = {
  active?: boolean;
  category?: FreeProfileCatalogCategory | null;
  category_id?: string | null;
  id: string;
  name: string;
  position?: number;
  slug: string;
};

export type FreeProfileCatalogCategory = {
  active: boolean;
  id: string;
  name: string;
  position: number;
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

export type FreeProfessionalProfileResponse = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  profile: {
    id: string;
    professional_first_name: string | null;
    professional_last_name: string | null;
    headline: string | null;
    bio: string | null;
    modality: string | null;
    languages: string[];
    cpf: string | null;
    birthdate: Date | null;
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
    cfp_verified_at: Date | null;
    identity_fields_locked: boolean;
  };
  plan: {
    approach_limit: number;
    can_upload_video: boolean;
    current_period_end: Date | null;
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
  upload_limits: {
    presentation_video_mb: number;
  };
  catalogs: {
    genders: FreeProfileCatalogItem[];
    specialty_categories: FreeProfileCatalogCategory[];
    specialties: FreeProfileCatalogItem[];
    services: FreeProfileCatalogItem[];
    approaches: FreeProfileCatalogItem[];
    languages: FreeProfileCatalogItem[];
    race_colors: FreeProfileCatalogItem[];
    religions: FreeProfileCatalogItem[];
    target_audiences: FreeProfileCatalogItem[];
  };
};

export type FreeProfessionalProfileUpdateBody = {
  name?: string;
  professional_first_name?: string | null;
  professional_last_name?: string | null;
  cpf?: string | null;
  birthdate?: Date | null;
  gender?: string | null;
  race_color?: string | null;
  religion?: string | null;
  crp_region?: string | null;
  crp_number?: string | null;
  whatsapp?: string | null;
  headline?: string | null;
  bio?: string | null;
  modality?: "online" | "presencial" | "hibrido" | null;
  languages?: string[];
  target_audience?: string[];
  discount_first_session?: boolean;
  social_value?: boolean;
  accepts_insurance?: boolean;
  show_experience_tag?: boolean;
  academic?: FreeProfessionalProfileAcademic;
  academic_formations?: FreeProfessionalProfileAcademic[];
  available_days?: string[];
  address?: FreeProfessionalProfileAddress;
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

export type FreeProfessionalProfileAvatarUploadResponse = {
  avatar_url: string;
  profile: FreeProfessionalProfileResponse | null;
};

export type FreeProfessionalProfileVideoUploadResponse = {
  profile: FreeProfessionalProfileResponse | null;
  video_url: string;
};

export type FreeProfessionalProfileVideoMultipartInitiateBody = {
  fileName?: string;
  mimeType: string;
  size: number;
};

export type FreeProfessionalProfileVideoMultipartPartBody = {
  partNumber: number | string;
  uploadSessionId: string;
};

export type FreeProfessionalProfileVideoMultipartCompleteBody = {
  parts: Array<{
    partId?: string;
    partNumber: number;
    partToken?: string;
  }>;
  uploadSessionId: string;
};

export type FreeProfessionalProfileVideoMultipartAbortBody = {
  uploadSessionId: string;
};

export type FreeProfessionalProfileVideoCoverUploadResponse = {
  profile: FreeProfessionalProfileResponse | null;
  video_cover_url: string;
};

export type FreeProfessionalProfileCoverImageUploadResponse = {
  cover_image_url: string;
  profile: FreeProfessionalProfileResponse | null;
};

export type FreeProfessionalProfileCoverImageRemovalResponse = {
  profile: FreeProfessionalProfileResponse | null;
};

export interface IFreeProfessionalProfileUploadAvatarDTO {
  auth: user;
  file?: {
    path?: string;
    key?: string;
    fileUrl?: string;
    mimetype?: string;
  };
}

export interface IFreeProfessionalProfileRemoveAvatarDTO {
  auth: user;
}

export interface IFreeProfessionalProfileUploadVideoDTO {
  auth: user;
  file?: {
    path?: string;
    key?: string;
    fileUrl?: string;
    mimetype?: string;
  };
}

export interface IFreeProfessionalProfileInitiateVideoMultipartDTO {
  auth: user;
  b: FreeProfessionalProfileVideoMultipartInitiateBody;
}

export interface IFreeProfessionalProfileUploadVideoMultipartPartDTO {
  auth: user;
  b: FreeProfessionalProfileVideoMultipartPartBody;
  file?: Express.Multer.File;
}

export interface IFreeProfessionalProfileCompleteVideoMultipartDTO {
  auth: user;
  b: FreeProfessionalProfileVideoMultipartCompleteBody;
}

export interface IFreeProfessionalProfileAbortVideoMultipartDTO {
  auth: user;
  b: FreeProfessionalProfileVideoMultipartAbortBody;
}

export interface IFreeProfessionalProfileUploadVideoCoverDTO {
  auth: user;
  file?: {
    path?: string;
    key?: string;
    fileUrl?: string;
    mimetype?: string;
  };
}

export interface IFreeProfessionalProfileUploadCoverImageDTO {
  auth: user;
  file?: {
    path?: string;
    key?: string;
    fileUrl?: string;
    mimetype?: string;
  };
}

export interface IFreeProfessionalProfileRemoveCoverImageDTO {
  auth: user;
}

export interface IFreeProfessionalProfileRemoveVideoDTO {
  auth: user;
}
