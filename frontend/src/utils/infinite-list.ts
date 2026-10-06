export const nextListPage = (page: { page: number; pages: number; data: unknown[] }) =>
  page.data.length > 0 && page.page < page.pages ? page.page + 1 : undefined;

export const flattenListPages = <T extends { id: string }>(
  pages: { data: T[] }[] | undefined,
): T[] => {
  const items = new Map<string, T>();
  for (const page of pages ?? []) {
    for (const item of page.data) items.set(item.id, item);
  }
  return [...items.values()];
};
