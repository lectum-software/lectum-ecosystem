import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  type CatalogOptionDefault,
  DEFAULT_APPROACHES,
  DEFAULT_GENDERS,
  DEFAULT_LANGUAGES,
  DEFAULT_RACE_COLORS,
  DEFAULT_RELIGIONS,
  DEFAULT_SERVICES,
  DEFAULT_SPECIALTY_CATEGORIES,
  DEFAULT_TARGET_AUDIENCES,
} from "@/modules/catalogs/defaults";
import type {
  AdminCatalogType,
  AdminSettingsCatalogOptionDTO,
  AdminSettingsCatalogsDTO,
  AdminSettingsSpecialtyCategoryDTO,
  AdminSettingsSpecialtyDTO,
  CatalogItemPayload,
} from "../DTOs/IAdminSettingsCatalogsDTO";

const catalogOrderBy = [
  { position: "asc" },
  { name: "asc" },
] satisfies Prisma.specialtyOrderByWithRelationInput[];

const toCatalogOption = (
  item: {
    active: boolean;
    createdAt: Date;
    id: string;
    name: string;
    position: number;
    slug: string;
    updatedAt: Date;
  },
  linked_count: number | null,
): AdminSettingsCatalogOptionDTO => ({
  active: item.active,
  created_at: item.createdAt,
  id: item.id,
  linked_count,
  name: item.name,
  position: item.position,
  slug: item.slug,
  updated_at: item.updatedAt,
});

const optionId = (prefix: string, slug: string) => `${prefix}-${slug}`.slice(0, 190);

const softDeleteData = (now = new Date()) => ({
  active: false,
  deleted: true,
  deletedAt: now,
});

const optionType = (type: AdminCatalogType) => {
  if (type === "language") return "language";
  if (type === "target_audience") return "target_audience";
  if (type === "gender") return "gender";
  if (type === "race_color") return "race_color";
  if (type === "religion") return "religion";

  return null;
};

export class AdminSettingsCatalogsRepository {
  async listCatalogs(): Promise<AdminSettingsCatalogsDTO> {
    const [
      categories,
      approaches,
      services,
      languages,
      targetAudiences,
      genders,
      raceColors,
      religions,
    ] = await Promise.all([
      prisma.specialty_category.findMany({
        where: { deleted: false },
        orderBy: catalogOrderBy,
        include: {
          specialties: {
            where: { deleted: false },
            orderBy: catalogOrderBy,
            include: {
              _count: {
                select: { psychologist_specialties: true },
              },
            },
          },
        },
      }),
      prisma.approach.findMany({
        where: { deleted: false },
        orderBy: catalogOrderBy,
        include: { _count: { select: { psychologist_approaches: true } } },
      }),
      prisma.service.findMany({
        where: { deleted: false },
        orderBy: catalogOrderBy,
        include: { _count: { select: { psychologist_services: true } } },
      }),
      prisma.profile_catalog_option.findMany({
        where: { deleted: false, type: "language" },
        orderBy: catalogOrderBy,
      }),
      prisma.profile_catalog_option.findMany({
        where: { deleted: false, type: "target_audience" },
        orderBy: catalogOrderBy,
      }),
      prisma.profile_catalog_option.findMany({
        where: { deleted: false, type: "gender" },
        orderBy: catalogOrderBy,
      }),
      prisma.profile_catalog_option.findMany({
        where: { deleted: false, type: "race_color" },
        orderBy: catalogOrderBy,
      }),
      prisma.profile_catalog_option.findMany({
        where: { deleted: false, type: "religion" },
        orderBy: catalogOrderBy,
      }),
    ]);

    const specialty_categories: AdminSettingsSpecialtyCategoryDTO[] = categories.map((category) => {
      const specialties: AdminSettingsSpecialtyDTO[] = category.specialties.map((specialty) => ({
        ...toCatalogOption(specialty, specialty._count.psychologist_specialties),
        category_id: specialty.category_id,
      }));

      return {
        ...toCatalogOption(
          category,
          specialties.reduce((total, specialty) => total + (specialty.linked_count ?? 0), 0),
        ),
        specialties,
      };
    });

    return {
      approaches: approaches.map((item) =>
        toCatalogOption(item, item._count.psychologist_approaches),
      ),
      genders: genders.map((item) => toCatalogOption(item, null)),
      languages: languages.map((item) => toCatalogOption(item, null)),
      race_colors: raceColors.map((item) => toCatalogOption(item, null)),
      religions: religions.map((item) => toCatalogOption(item, null)),
      services: services.map((item) => toCatalogOption(item, item._count.psychologist_services)),
      specialty_categories,
      target_audiences: targetAudiences.map((item) => toCatalogOption(item, null)),
    };
  }

  async slugExists(type: AdminCatalogType, slug: string, excludeId?: string) {
    const baseWhere = { slug, ...(excludeId ? { id: { not: excludeId } } : {}) };

    if (type === "specialty_category") {
      return Boolean(
        await prisma.specialty_category.findFirst({ where: baseWhere, select: { id: true } }),
      );
    }
    if (type === "specialty") {
      return Boolean(await prisma.specialty.findFirst({ where: baseWhere, select: { id: true } }));
    }
    if (type === "service") {
      return Boolean(await prisma.service.findFirst({ where: baseWhere, select: { id: true } }));
    }
    if (type === "approach") {
      return Boolean(await prisma.approach.findFirst({ where: baseWhere, select: { id: true } }));
    }

    const catalogType = optionType(type);
    if (!catalogType) return false;

    return Boolean(
      await prisma.profile_catalog_option.findFirst({
        where: { ...baseWhere, type: catalogType },
        select: { id: true },
      }),
    );
  }

  async nextPosition(type: AdminCatalogType, categoryId?: string | null) {
    const orderBy = { position: "desc" } as const;

    if (type === "specialty_category") {
      const last = await prisma.specialty_category.findFirst({
        where: { deleted: false },
        orderBy,
      });
      return (last?.position ?? -10) + 10;
    }
    if (type === "specialty") {
      const last = await prisma.specialty.findFirst({
        where: { deleted: false, category_id: categoryId || undefined },
        orderBy,
      });
      return (last?.position ?? -10) + 10;
    }
    if (type === "service") {
      const last = await prisma.service.findFirst({ where: { deleted: false }, orderBy });
      return (last?.position ?? -10) + 10;
    }
    if (type === "approach") {
      const last = await prisma.approach.findFirst({ where: { deleted: false }, orderBy });
      return (last?.position ?? -10) + 10;
    }

    const catalogType = optionType(type);
    const last = await prisma.profile_catalog_option.findFirst({
      where: { deleted: false, type: catalogType || "" },
      orderBy,
    });
    return (last?.position ?? -10) + 10;
  }

  async categoryExists(id: string) {
    return Boolean(
      await prisma.specialty_category.findFirst({
        where: { id, deleted: false },
        select: { id: true },
      }),
    );
  }

  async createCategory(
    data: Required<Pick<CatalogItemPayload, "active" | "name" | "position">> & { slug: string },
  ) {
    return prisma.specialty_category.create({
      data: {
        active: data.active,
        name: data.name,
        position: data.position,
        slug: data.slug,
      },
    });
  }

  async updateCategory(
    id: string,
    data: Partial<
      Required<Pick<CatalogItemPayload, "active" | "name" | "position">> & { slug: string }
    >,
  ) {
    return prisma.specialty_category.updateMany({
      where: { id, deleted: false },
      data,
    });
  }

  async createItem(
    type: Exclude<AdminCatalogType, "specialty_category">,
    data: Required<Pick<CatalogItemPayload, "active" | "name" | "position">> & {
      category_id?: string | null;
      slug: string;
    },
  ) {
    if (type === "specialty") {
      return prisma.specialty.create({
        data: {
          active: data.active,
          category_id: data.category_id,
          name: data.name,
          position: data.position,
          slug: data.slug,
        },
      });
    }
    if (type === "service") {
      return prisma.service.create({
        data: { active: data.active, name: data.name, position: data.position, slug: data.slug },
      });
    }
    if (type === "approach") {
      return prisma.approach.create({
        data: { active: data.active, name: data.name, position: data.position, slug: data.slug },
      });
    }

    const catalogType = optionType(type) || type;
    return prisma.profile_catalog_option.create({
      data: {
        active: data.active,
        name: data.name,
        position: data.position,
        slug: data.slug,
        type: catalogType,
      },
    });
  }

  async updateItem(
    type: Exclude<AdminCatalogType, "specialty_category">,
    id: string,
    data: Partial<
      Required<Pick<CatalogItemPayload, "active" | "name" | "position">> & {
        category_id?: string | null;
        slug: string;
      }
    >,
  ) {
    if (type === "specialty") {
      return prisma.specialty.updateMany({ where: { id, deleted: false }, data });
    }
    if (type === "service") {
      return prisma.service.updateMany({ where: { id, deleted: false }, data });
    }
    if (type === "approach") {
      return prisma.approach.updateMany({ where: { id, deleted: false }, data });
    }

    const catalogType = optionType(type) || type;
    return prisma.profile_catalog_option.updateMany({
      where: { id, deleted: false, type: catalogType },
      data,
    });
  }

  async deleteCategory(id: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const result = await tx.specialty_category.updateMany({
        where: { id, deleted: false },
        data: softDeleteData(now),
      });

      if (result.count === 0) return result;

      await tx.specialty.updateMany({
        where: { category_id: id, deleted: false },
        data: softDeleteData(now),
      });

      return result;
    });
  }

  async deleteItem(type: Exclude<AdminCatalogType, "specialty_category">, id: string) {
    const data = softDeleteData();

    if (type === "specialty") {
      return prisma.specialty.updateMany({ where: { id, deleted: false }, data });
    }
    if (type === "service") {
      return prisma.service.updateMany({ where: { id, deleted: false }, data });
    }
    if (type === "approach") {
      return prisma.approach.updateMany({ where: { id, deleted: false }, data });
    }

    const catalogType = optionType(type) || type;
    return prisma.profile_catalog_option.updateMany({
      where: { id, deleted: false, type: catalogType },
      data,
    });
  }

  async reorder(type: AdminCatalogType, ids: string[], categoryId?: string | null) {
    return prisma.$transaction(
      ids.map((id, index) => {
        const data = { position: index * 10 };

        if (type === "specialty_category") {
          return prisma.specialty_category.updateMany({ where: { id, deleted: false }, data });
        }
        if (type === "specialty") {
          return prisma.specialty.updateMany({
            where: { id, deleted: false, category_id: categoryId || undefined },
            data: { ...data, ...(categoryId ? { category_id: categoryId } : {}) },
          });
        }
        if (type === "service") {
          return prisma.service.updateMany({ where: { id, deleted: false }, data });
        }
        if (type === "approach") {
          return prisma.approach.updateMany({ where: { id, deleted: false }, data });
        }

        const catalogType = optionType(type) || type;
        return prisma.profile_catalog_option.updateMany({
          where: { id, deleted: false, type: catalogType },
          data,
        });
      }),
    );
  }

  async restoreDefaults() {
    return prisma.$transaction(async (tx) => {
      for (const [categoryIndex, category] of DEFAULT_SPECIALTY_CATEGORIES.entries()) {
        const savedCategory = await tx.specialty_category.upsert({
          where: { slug: category.slug },
          create: {
            active: true,
            deleted: false,
            id: optionId("specialty-category", category.slug),
            name: category.name,
            position: categoryIndex * 10,
            slug: category.slug,
          },
          update: {
            active: true,
            deleted: false,
            deletedAt: null,
            name: category.name,
            position: categoryIndex * 10,
          },
        });

        for (const [specialtyIndex, specialty] of category.specialties.entries()) {
          await tx.specialty.upsert({
            where: { slug: specialty.slug },
            create: {
              active: true,
              category_id: savedCategory.id,
              deleted: false,
              id: optionId("specialty", specialty.slug),
              name: specialty.name,
              position: specialtyIndex * 10,
              slug: specialty.slug,
            },
            update: {
              active: true,
              category_id: savedCategory.id,
              deleted: false,
              deletedAt: null,
              name: specialty.name,
              position: specialtyIndex * 10,
            },
          });
        }
      }

      const restoreOptions = async (
        type:
          | "approach"
          | "gender"
          | "language"
          | "race_color"
          | "religion"
          | "service"
          | "target_audience",
        defaults: readonly CatalogOptionDefault[],
      ) => {
        for (const [index, item] of defaults.entries()) {
          if (type === "approach") {
            await tx.approach.upsert({
              where: { slug: item.slug },
              create: {
                active: true,
                deleted: false,
                id: optionId("approach", item.slug),
                name: item.name,
                position: index * 10,
                slug: item.slug,
              },
              update: {
                active: true,
                deleted: false,
                deletedAt: null,
                name: item.name,
                position: index * 10,
              },
            });
          } else if (type === "service") {
            await tx.service.upsert({
              where: { slug: item.slug },
              create: {
                active: true,
                deleted: false,
                id: optionId("service", item.slug),
                name: item.name,
                position: index * 10,
                slug: item.slug,
              },
              update: {
                active: true,
                deleted: false,
                deletedAt: null,
                name: item.name,
                position: index * 10,
              },
            });
          } else {
            await tx.profile_catalog_option.upsert({
              where: { type_slug: { slug: item.slug, type } },
              create: {
                active: true,
                deleted: false,
                id: optionId(`profile-catalog-${type}`, item.slug),
                name: item.name,
                position: index * 10,
                slug: item.slug,
                type,
              },
              update: {
                active: true,
                deleted: false,
                deletedAt: null,
                name: item.name,
                position: index * 10,
              },
            });
          }
        }
      };

      await restoreOptions("approach", DEFAULT_APPROACHES);
      await restoreOptions("service", DEFAULT_SERVICES);
      await restoreOptions("language", DEFAULT_LANGUAGES);
      await restoreOptions("target_audience", DEFAULT_TARGET_AUDIENCES);
      await restoreOptions("gender", DEFAULT_GENDERS);
      await restoreOptions("race_color", DEFAULT_RACE_COLORS);
      await restoreOptions("religion", DEFAULT_RELIGIONS);
    });
  }
}
