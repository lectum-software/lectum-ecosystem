import type { QueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { PatientRelationListResponse, PatientRelationQuery } from "@/api/generator/types";

export const loadFavoriteIds = async (
  readPage: (query: PatientRelationQuery) => Promise<PatientRelationListResponse>,
  signal: AbortSignal,
) => {
  const ids = new Set<string>();
  let page = 1;
  let pages = 1;
  do {
    signal.throwIfAborted();
    const result = await readPage({ page, limit: 50 });
    signal.throwIfAborted();
    for (const author of result.data) if (author.favorited) ids.add(author.id);
    pages = result.pages;
    page++;
  } while (page <= pages);
  return [...ids];
};

export const updateFavoriteIds = (
  client: QueryClient,
  userId: string | undefined,
  id: string,
  favorited: boolean,
) => {
  if (!userId) return;
  client.setQueryData<string[]>(keys.patient.favoriteIds(userId), (old) => {
    if (!old) return old;
    return favorited ? [...new Set([...old, id])] : old.filter((item) => item !== id);
  });
};
