import type {
  DirectoryCatalogCategory,
  DirectoryCatalogItem,
} from "@/api/generator/types/directory";
import type { FieldOption } from "@/hooks/form";

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

const sortCatalogCategories = <T extends DirectoryCatalogCategory>(items: T[] = []) =>
  [...items].sort((left, right) => {
    const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
    const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

    if (leftPosition !== rightPosition) return leftPosition - rightPosition;

    return collator.compare(left.name, right.name);
  });

const sortCatalogItems = <T extends DirectoryCatalogItem>(items: T[] = []) =>
  [...items].sort((left, right) => {
    const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
    const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

    if (leftPosition !== rightPosition) return leftPosition - rightPosition;

    return collator.compare(left.name, right.name);
  });

const toOptions = (items: DirectoryCatalogItem[] = []): FieldOption[] =>
  sortCatalogItems(items).map((item) => ({
    label: item.name,
    value: item.slug,
  }));

export const toGroupedSpecialtyOptions = (
  items: DirectoryCatalogItem[] = [],
  categories: DirectoryCatalogCategory[] = [],
): FieldOption[] => {
  const groups = new Map<
    string,
    {
      name: string;
      order: number;
      position: number;
      items: DirectoryCatalogItem[];
    }
  >();

  for (const [order, category] of sortCatalogCategories(categories).entries()) {
    if (!category.active) continue;

    groups.set(category.id, {
      name: category.name,
      order,
      position: category.position ?? Number.POSITIVE_INFINITY,
      items: [],
    });
  }

  for (const item of items) {
    const category = item.category;
    const key = category?.id || "uncategorized";
    const current = groups.get(key) ?? {
      name: category?.name || "Outras especialidades",
      order: groups.size,
      position: category?.position ?? Number.POSITIVE_INFINITY,
      items: [],
    };

    current.items.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .filter((group) => group.items.length > 0)
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      if (left.position !== right.position) return left.position - right.position;

      return collator.compare(left.name, right.name);
    })
    .flatMap((group) =>
      sortCatalogItems(group.items).map((item) => ({
        group: group.name,
        label: item.name,
        value: item.slug,
      })),
    );
};

export const toServiceOptions = toOptions;
export const toCatalogOptions = toOptions;

export const toLanguageOptions = (items: DirectoryCatalogItem[] = []): FieldOption[] =>
  sortCatalogItems(items).map((item) => ({
    label: item.name,
    value: item.name,
  }));
