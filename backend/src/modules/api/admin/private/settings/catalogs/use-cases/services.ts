import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminCatalogType,
  CatalogItemPayload,
  IAdminSettingsCatalogsDTO,
} from "../DTOs/IAdminSettingsCatalogsDTO";
import { AdminSettingsCatalogsRepository } from "../repositories/AdminSettingsCatalogsRepository";

const RESET_CONFIRMATION = "RESTAURAR PADROES";
const DELETE_CONFIRMATION = "EXCLUIR CATALOGO";

const mutableItemTypes = [
  "approach",
  "service",
  "language",
  "target_audience",
  "gender",
  "race_color",
  "religion",
  "specialty",
] as const;
type MutableItemType = (typeof mutableItemTypes)[number];

const invalid = (model = "catalog") => ({
  status: 422,
  ...error("invalid", { model }),
});

const notFound = (model = "catalog") => ({
  status: 404,
  ...error("not_found", { model }),
});

const normalizeName = (value?: string) => value?.trim();

const slugify = (value: string) => {
  const slug = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "catalogo";
};

const ensureUniqueSlug = async (
  repository: AdminSettingsCatalogsRepository,
  type: AdminCatalogType,
  value: string,
) => {
  const base = slugify(value);
  let slug = base;
  let index = 2;

  while (await repository.slugExists(type, slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
};

const cleanPosition = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : undefined;

const list = async (
  repository: AdminSettingsCatalogsRepository,
  status = 200,
): Promise<Resolve> => ({
  status,
  ...msg("index", {}),
  data: await repository.listCatalogs(),
});

const normalizeCreateBody = async (
  repository: AdminSettingsCatalogsRepository,
  type: AdminCatalogType,
  body?: CatalogItemPayload,
) => {
  const name = normalizeName(body?.name);
  if (!name) return null;

  return {
    active: body?.active ?? true,
    name,
    position:
      cleanPosition(body?.position) ?? (await repository.nextPosition(type, body?.category_id)),
    slug: await ensureUniqueSlug(repository, type, name),
  };
};

const updatePayload = (body?: CatalogItemPayload) => {
  const payload: Partial<Required<Pick<CatalogItemPayload, "active" | "name" | "position">>> = {};
  const name = normalizeName(body?.name);

  if (name) payload.name = name;
  if (typeof body?.active === "boolean") payload.active = body.active;

  const position = cleanPosition(body?.position);
  if (position !== undefined) payload.position = position;

  return payload;
};

export const index = async (): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();

  return list(repository);
};

export const createCategory = async (data: IAdminSettingsCatalogsDTO): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const body = await normalizeCreateBody(repository, "specialty_category", data.b);
  if (!body) return invalid("specialty_category");

  await repository.createCategory(body);

  return list(repository, 201);
};

export const updateCategory = async (data: IAdminSettingsCatalogsDTO): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const id = data.p?.id;
  if (!id) return invalid("specialty_category");

  const result = await repository.updateCategory(id, updatePayload(data.b));
  if (result.count === 0) return notFound("specialty_category");

  return list(repository);
};

export const deleteCategory = async (data: IAdminSettingsCatalogsDTO): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const id = data.p?.id;
  if (!id) return invalid("specialty_category");

  if (data.b?.confirmation?.trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return {
      status: 422,
      ...error("invalid", { model: "catalog_delete_confirmation" }),
    };
  }

  const result = await repository.deleteCategory(id);
  if (result.count === 0) return notFound("specialty_category");

  return {
    status: 200,
    ...msg("admin_settings_catalog_deleted"),
    data: await repository.listCatalogs(),
  };
};

export const createItem = async (
  type: MutableItemType,
  data: IAdminSettingsCatalogsDTO,
): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const body = await normalizeCreateBody(repository, type, data.b);
  if (!body) return invalid(type);

  if (type === "specialty") {
    const categoryId = data.b?.category_id;
    if (!categoryId || !(await repository.categoryExists(categoryId))) {
      return invalid("specialty_category");
    }

    await repository.createItem(type, { ...body, category_id: categoryId });
  } else {
    await repository.createItem(type, body);
  }

  return list(repository, 201);
};

export const updateItem = async (
  type: MutableItemType,
  data: IAdminSettingsCatalogsDTO,
): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const id = data.p?.id;
  if (!id) return invalid(type);

  const payload: ReturnType<typeof updatePayload> & { category_id?: string | null } = updatePayload(
    data.b,
  );
  if (type === "specialty" && data.b?.category_id) {
    if (!(await repository.categoryExists(data.b.category_id)))
      return invalid("specialty_category");
    payload.category_id = data.b.category_id;
  }

  const result = await repository.updateItem(type, id, payload);
  if (result.count === 0) return notFound(type);

  return list(repository);
};

export const deleteItem = async (
  type: MutableItemType,
  data: IAdminSettingsCatalogsDTO,
): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const id = data.p?.id;
  if (!id) return invalid(type);

  if (data.b?.confirmation?.trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return {
      status: 422,
      ...error("invalid", { model: "catalog_delete_confirmation" }),
    };
  }

  const result = await repository.deleteItem(type, id);
  if (result.count === 0) return notFound(type);

  return {
    status: 200,
    ...msg("admin_settings_catalog_deleted"),
    data: await repository.listCatalogs(),
  };
};

export const reorder = async (data: IAdminSettingsCatalogsDTO): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();
  const type = data.b?.type;
  const ids = data.b?.ids;

  if (!type || !ids?.length || !ids.every((id) => typeof id === "string" && id.trim())) {
    return invalid("catalog_reorder");
  }

  if (type === "specialty" && data.b?.category_id) {
    if (!(await repository.categoryExists(data.b.category_id)))
      return invalid("specialty_category");
  }

  await repository.reorder(type, ids, data.b?.category_id);

  return list(repository);
};

export const restoreDefaults = async (data: IAdminSettingsCatalogsDTO): Promise<Resolve> => {
  const repository = new AdminSettingsCatalogsRepository();

  if (data.b?.confirmation !== RESET_CONFIRMATION) {
    return {
      status: 422,
      ...error("invalid", { model: "catalog_restore_confirmation" }),
    };
  }

  await repository.restoreDefaults();

  return {
    status: 200,
    ...msg("updated", { model: "catalog_defaults" }),
    data: await repository.listCatalogs(),
  };
};
