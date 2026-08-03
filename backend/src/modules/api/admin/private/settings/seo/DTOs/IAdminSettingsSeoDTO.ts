import type { admin } from "@/interfaces/objects";
import type { SeoMetadataPageKey } from "@/modules/seo/metadata-settings";

export type AdminSeoMetadataPayload = {
  canonical_url?: string | null;
  description?: string;
  keywords?: string;
  og_description?: string | null;
  og_image_url?: string | null;
  og_title?: string | null;
  robots_follow?: boolean;
  robots_index?: boolean;
  title?: string;
};

export type IAdminSettingsSeoDTO = {
  admin: admin;
  b?: AdminSeoMetadataPayload;
  p?: {
    page_key?: SeoMetadataPageKey | string;
  };
};
