import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { managedSeoRouteDefaults } from "../managed-route-defaults";
import {
  SEO_METADATA_DEFAULTS,
  type SeoMetadataPageKey,
  type SeoMetadataSettingPayload,
  type SeoMetadataSettingsDTO,
  toSeoMetadataSettingDTO,
} from "../metadata-settings";

const settingsOrder = SEO_METADATA_DEFAULTS.map((setting) => setting.page_key);

const asJsonArray = (value?: string[] | null): Prisma.InputJsonValue => value ?? [];

const defaultCreateData = (setting: (typeof SEO_METADATA_DEFAULTS)[number]) => ({
  canonical_url: setting.canonical_url,
  description: setting.description,
  id: setting.id,
  keywords: asJsonArray(setting.keywords),
  label: setting.label,
  og_description: setting.og_description,
  og_image_url: setting.og_image_url,
  og_title: setting.og_title,
  page_key: setting.page_key,
  robots_follow: setting.robots_follow,
  robots_index: setting.robots_index,
  route_path: setting.route_path,
  title: setting.title,
});

export type SeoMetadataAuditInput = {
  adminId: string;
  changedFields: string[];
  safeAfter: Prisma.InputJsonValue;
  safeBefore: Prisma.InputJsonValue;
  settingId: string;
};

export class SeoMetadataRepository {
  private async syncManagedRouteDefaults() {
    const settings = await prisma.site_seo_setting.findMany({
      select: {
        canonical_url: true,
        id: true,
        page_key: true,
        route_path: true,
      },
      where: { deleted: false, page_key: { in: [...settingsOrder] } },
      orderBy: { id: "asc" },
    });
    const operations: Array<ReturnType<typeof prisma.site_seo_setting.updateMany>> = [];

    for (const setting of settings) {
      const data = managedSeoRouteDefaults(setting);
      if (data.route_path === setting.route_path && data.canonical_url === setting.canonical_url) {
        continue;
      }

      operations.push(
        prisma.site_seo_setting.updateMany({
          data,
          where: {
            id: setting.id,
            deleted: false,
            route_path: setting.route_path,
            canonical_url: setting.canonical_url,
          },
        }),
      );
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }
  }

  async ensureDefaults() {
    const existing = await prisma.site_seo_setting.findMany({
      select: { page_key: true },
      where: { page_key: { in: [...settingsOrder] } },
    });
    const existingKeys = new Set(existing.map((setting) => setting.page_key));
    const missingDefaults = SEO_METADATA_DEFAULTS.filter(
      (setting) => !existingKeys.has(setting.page_key),
    );

    if (missingDefaults.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.site_seo_setting.createMany({
          data: missingDefaults.map(defaultCreateData),
          skipDuplicates: true,
        });
        // ON CONFLICT também pode ignorar colisão de ID com outra chave: não ocultar ausência.
        const initialized = await tx.site_seo_setting.findMany({
          select: { page_key: true },
          where: { page_key: { in: missingDefaults.map((setting) => setting.page_key) } },
        });
        if (initialized.length !== missingDefaults.length) {
          throw new Error("SEO_DEFAULT_INITIALIZATION_INCOMPLETE");
        }
      });
    }

    await this.syncManagedRouteDefaults();
  }

  async list(): Promise<SeoMetadataSettingsDTO> {
    const settings = await prisma.site_seo_setting.findMany({
      where: { deleted: false },
      orderBy: [{ createdAt: "asc" }],
    });

    const byKey = new Map(settings.map((setting) => [setting.page_key, setting]));
    const orderedSettings = settingsOrder
      .map((key) => byKey.get(key))
      .filter((setting): setting is NonNullable<typeof setting> => Boolean(setting));
    const knownIds = new Set(orderedSettings.map((setting) => setting.id));
    const customSettings = settings
      .filter((setting) => !knownIds.has(setting.id))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    const allSettings = [...orderedSettings, ...customSettings];

    return {
      settings: allSettings.map((setting) =>
        toSeoMetadataSettingDTO({ ...setting, ...managedSeoRouteDefaults(setting) }),
      ),
      updated_at: allSettings.reduce<Date | null>((latest, setting) => {
        if (!latest || setting.updatedAt > latest) return setting.updatedAt;
        return latest;
      }, null),
    };
  }

  async findByKey(pageKey: SeoMetadataPageKey) {
    return prisma.site_seo_setting.findFirst({
      where: { deleted: false, page_key: pageKey },
    });
  }

  async update(
    pageKey: SeoMetadataPageKey,
    payload: SeoMetadataSettingPayload,
    audit?: SeoMetadataAuditInput,
  ) {
    const data = {
      canonical_url: payload.canonical_url,
      description: payload.description,
      keywords: asJsonArray(payload.keywords),
      og_description: payload.og_description,
      og_image_url: payload.og_image_url,
      og_title: payload.og_title,
      robots_follow: payload.robots_follow,
      robots_index: payload.robots_index,
      title: payload.title,
      updated_by_admin_id: audit?.adminId,
    };

    return prisma.$transaction(async (tx) => {
      const updated = await tx.site_seo_setting.update({
        where: { page_key: pageKey },
        data,
      });

      if (audit && audit.changedFields.length > 0) {
        await tx.admin_activity_log.create({
          data: {
            action: "seo_metadata_updated",
            admin_id: audit.adminId,
            area: "seo_metadados",
            changed_fields: audit.changedFields,
            domain: "site_seo_setting",
            metadata: { page_key: pageKey, route_path: updated.route_path },
            safe_after: audit.safeAfter,
            safe_before: audit.safeBefore,
            source: "admin_panel",
            target_id: audit.settingId,
            target_type: "seo_metadata",
          },
        });
      }

      return updated;
    });
  }
}
