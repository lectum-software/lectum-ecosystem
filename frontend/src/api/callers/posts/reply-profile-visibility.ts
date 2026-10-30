"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import { setReplyProfileVisibility } from "@/api/req/posts/reply-profile-visibility";
import { invalidateDirectoryPsychologistQueries } from "./queries";
import {
  type MineVisibilityCache,
  updateReplyProfileVisibilityCache,
} from "./reply-profile-visibility-cache";

export const useReplyProfileVisibility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReplyProfileVisibility,
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: keys.posts.mine() });
      queryClient.setQueriesData<MineVisibilityCache>({ queryKey: keys.posts.mine() }, (old) =>
        updateReplyProfileVisibilityCache(old, data),
      );
      invalidateDirectoryPsychologistQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: keys.posts.mine() });
    },
  });
};
