import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { DirectoryPsychologistsResponse } from "@/api/generator/types/directory";

export type RelationPatch = Partial<
  Pick<DirectoryPsychologistsResponse["data"][number], "favorited" | "followed">
>;

export const updateDirectoryRelation = (
  queryClient: QueryClient,
  psychologistId: string,
  patch: RelationPatch,
) => {
  const updatePage = (page: DirectoryPsychologistsResponse) => ({
    ...page,
    data: page.data.map((psychologist) =>
      psychologist.id === psychologistId ? { ...psychologist, ...patch } : psychologist,
    ),
  });
  queryClient.setQueriesData<
    DirectoryPsychologistsResponse | InfiniteData<DirectoryPsychologistsResponse>
  >({ queryKey: keys.directory.psychologistsRoot() }, (old) => {
    if (!old) return old;
    // Explore and ordinary search share this cache root but store different shapes.
    return "pageParams" in old ? { ...old, pages: old.pages.map(updatePage) } : updatePage(old);
  });
};
