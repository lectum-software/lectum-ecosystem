import type { admin } from "@/interfaces/objects";

export const ADMIN_CATALOG_TYPES = [
  "approach",
  "service",
  "language",
  "target_audience",
  "specialty",
  "specialty_category",
] as const;

export type AdminCatalogType = (typeof ADMIN_CATALOG_TYPES)[number];

export type CatalogItemPayload = {
  active?: boolean;
  category_id?: string;
  name?: string;
  position?: number;
};

export type CatalogReorderPayload = {
  category_id?: string;
  ids?: string[];
  type?: AdminCatalogType;
};

export type CatalogResetPayload = {
  confirmation?: string;
};

export type IAdminSettingsCatalogsDTO = {
  admin: admin;
  b?: CatalogItemPayload & CatalogReorderPayload & CatalogResetPayload;
  p?: {
    id?: string;
  };
};

export type AdminSettingsCatalogOptionDTO = {
  active: boolean;
  created_at: Date;
  id: string;
  linked_count: number | null;
  name: string;
  position: number;
  slug: string;
  updated_at: Date;
};

export type AdminSettingsSpecialtyDTO = AdminSettingsCatalogOptionDTO & {
  category_id: string | null;
};

export type AdminSettingsSpecialtyCategoryDTO = AdminSettingsCatalogOptionDTO & {
  specialties: AdminSettingsSpecialtyDTO[];
};

export type AdminSettingsCatalogsDTO = {
  approaches: AdminSettingsCatalogOptionDTO[];
  languages: AdminSettingsCatalogOptionDTO[];
  services: AdminSettingsCatalogOptionDTO[];
  specialty_categories: AdminSettingsSpecialtyCategoryDTO[];
  target_audiences: AdminSettingsCatalogOptionDTO[];
};
