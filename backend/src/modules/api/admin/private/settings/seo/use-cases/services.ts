import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  isSeoMetadataPageKey,
  type SeoMetadataPageKey,
  type SeoMetadataSettingDTO,
  type SeoMetadataSettingPayload,
  toSeoMetadataSettingDTO,
} from "@/modules/seo/metadata-settings";
import { SeoMetadataRepository } from "@/modules/seo/repositories/SeoMetadataRepository";
import type {
  IAdminSettingsSeoDTO,
  IAdminSettingsSeoUploadImageDTO,
} from "../DTOs/IAdminSettingsSeoDTO";

const FIELD_LABELS: Record<keyof SeoMetadataSettingPayload, string> = {
  canonical_url: "URL canônica",
  description: "Descrição",
  keywords: "Palavras-chave",
  og_description: "Descrição Open Graph",
  og_image_url: "Imagem Open Graph",
  og_title: "Título Open Graph",
  robots_follow: "Robots follow",
  robots_index: "Robots index",
  title: "Título",
};

const normalizeText = (value?: string | null) => value?.trim() ?? "";

const nullableText = (value?: string | null) => {
  const normalized = normalizeText(value);

  return normalized.length > 0 ? normalized : null;
};

const isPathOrHttpUrl = (value?: string | null) => {
  if (!value) return true;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isOpenGraphImagePath = (value?: string | null) => {
  if (!value) return true;

  if (value.startsWith("/public/files/")) return value.startsWith("/public/files/seo/og-image/");
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);

    return url.pathname.startsWith("/public/files/seo/og-image/");
  } catch {
    return false;
  }
};

const publicSeoImagePath = (key: string) => `/public/files/${key}`;

const parseKeywords = (value?: string | null) =>
  Array.from(
    new Set(
      normalizeText(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);

const snapshot = (setting: SeoMetadataSettingDTO): Prisma.InputJsonValue => ({
  canonical_url: setting.canonical_url,
  description: setting.description,
  keywords: setting.keywords,
  og_description: setting.og_description,
  og_image_url: setting.og_image_url,
  og_title: setting.og_title,
  page_key: setting.page_key,
  robots_follow: setting.robots_follow,
  robots_index: setting.robots_index,
  title: setting.title,
});

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const changedFields = (before: SeoMetadataSettingDTO, after: SeoMetadataSettingPayload) => {
  const fields: string[] = [];

  if (before.title !== after.title) fields.push(FIELD_LABELS.title);
  if (before.description !== after.description) fields.push(FIELD_LABELS.description);
  if (!arraysEqual(before.keywords ?? [], after.keywords ?? [])) fields.push(FIELD_LABELS.keywords);
  if ((before.og_title ?? null) !== (after.og_title ?? null)) fields.push(FIELD_LABELS.og_title);
  if ((before.og_description ?? null) !== (after.og_description ?? null)) {
    fields.push(FIELD_LABELS.og_description);
  }
  if ((before.og_image_url ?? null) !== (after.og_image_url ?? null)) {
    fields.push(FIELD_LABELS.og_image_url);
  }
  if ((before.canonical_url ?? null) !== (after.canonical_url ?? null)) {
    fields.push(FIELD_LABELS.canonical_url);
  }
  if (before.robots_index !== after.robots_index) fields.push(FIELD_LABELS.robots_index);
  if (before.robots_follow !== after.robots_follow) fields.push(FIELD_LABELS.robots_follow);

  return fields;
};

const invalid = (model = "seo_metadata") => ({
  status: 422,
  ...error("invalid", { model }),
});

export const index = async (): Promise<Resolve> => {
  const repository = new SeoMetadataRepository();

  return {
    status: 200,
    ...msg("index", {}),
    data: await repository.list(),
  };
};

const findSetting = async (pageKey?: SeoMetadataPageKey | string) => {
  if (!isSeoMetadataPageKey(pageKey)) return null;

  const repository = new SeoMetadataRepository();

  return repository.findByKey(pageKey);
};

export const authorizeUploadImage = async (data: IAdminSettingsSeoDTO): Promise<Resolve> => {
  const current = await findSetting(data.p?.page_key);

  if (!current) {
    return {
      status: isSeoMetadataPageKey(data.p?.page_key) ? 404 : 422,
      ...error(isSeoMetadataPageKey(data.p?.page_key) ? "not_found" : "invalid", {
        model: isSeoMetadataPageKey(data.p?.page_key) ? "seo_metadata" : "seo_metadata_page",
      }),
    };
  }

  return {
    status: 200,
    success: true,
  };
};

export const uploadImage = async (data: IAdminSettingsSeoUploadImageDTO): Promise<Resolve> => {
  const current = await findSetting(data.p?.page_key);

  if (!current) {
    return {
      status: isSeoMetadataPageKey(data.p?.page_key) ? 404 : 422,
      ...error(isSeoMetadataPageKey(data.p?.page_key) ? "not_found" : "invalid", {
        model: isSeoMetadataPageKey(data.p?.page_key) ? "seo_metadata" : "seo_metadata_page",
      }),
    };
  }

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("seo/og-image/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  return {
    status: 200,
    ...msg("admin_settings_seo_og_image_uploaded"),
    data: {
      og_image_url: publicSeoImagePath(key),
    },
  };
};

export const update = async (data: IAdminSettingsSeoDTO): Promise<Resolve> => {
  const pageKey = data.p?.page_key;
  if (!isSeoMetadataPageKey(pageKey)) return invalid("seo_metadata_page");

  const title = normalizeText(data.b?.title);
  const description = normalizeText(data.b?.description);

  if (!title || !description) return invalid();

  const repository = new SeoMetadataRepository();
  const current = await repository.findByKey(pageKey);
  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "seo_metadata" }),
    };
  }

  const before = toSeoMetadataSettingDTO(current);
  const payload: SeoMetadataSettingPayload = {
    canonical_url: nullableText(data.b?.canonical_url),
    description,
    keywords: parseKeywords(data.b?.keywords),
    og_description: nullableText(data.b?.og_description),
    og_image_url: nullableText(data.b?.og_image_url),
    og_title: nullableText(data.b?.og_title),
    robots_follow: data.b?.robots_follow ?? true,
    robots_index: data.b?.robots_index ?? true,
    title,
  };

  if (
    !isPathOrHttpUrl(payload.canonical_url) ||
    !isPathOrHttpUrl(payload.og_image_url) ||
    !isOpenGraphImagePath(payload.og_image_url)
  ) {
    return invalid();
  }

  const fields = changedFields(before, payload);

  if (fields.length === 0) {
    return {
      status: 200,
      ...msg("admin_settings_seo_no_changes"),
      data: await repository.list(),
    };
  }

  await repository.update(pageKey, payload, {
    adminId: String(data.admin.id),
    changedFields: fields,
    safeAfter: snapshot({ ...before, ...payload, updated_at: new Date() }),
    safeBefore: snapshot(before),
    settingId: current.id,
  });

  return {
    status: 200,
    ...msg("admin_settings_seo_updated"),
    data: await repository.list(),
  };
};
