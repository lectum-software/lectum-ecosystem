import type { PostContentVideo } from "@/api/generator/types/posts";

export const contentVideoKey = (
  item: Pick<PostContentVideo, "id" | "post_id" | "reply_id" | "media_item_id">,
) =>
  `${item.post_id}:${item.reply_id ? `reply:${item.reply_id}` : `post:${item.media_item_id ?? item.id}`}`;

export type ContentVideoInteractionState = {
  items: PostContentVideo[];
  revision: number;
  staleInteractions: Record<string, number>;
  discussionRevisions?: Record<string, number>;
};

export const invalidateContentVideoDiscussion = (
  state: ContentVideoInteractionState,
  postId: string,
): ContentVideoInteractionState => {
  const revision = state.revision + 1;
  const staleInteractions = { ...state.staleInteractions };
  for (const item of state.items) {
    if (item.post_id === postId) staleInteractions[contentVideoKey(item)] = revision;
  }
  return {
    ...state,
    revision,
    staleInteractions,
    discussionRevisions: { ...state.discussionRevisions, [postId]: revision },
  };
};

export const appendContentVideoPage = (
  state: ContentVideoInteractionState,
  added: PostContentVideo[],
  requestedRevision: number,
): ContentVideoInteractionState => {
  const staleInteractions = { ...state.staleInteractions };
  for (const item of added) {
    const revision = state.discussionRevisions?.[item.post_id] ?? 0;
    if (revision > requestedRevision) staleInteractions[contentVideoKey(item)] = revision;
  }
  return { ...state, items: [...state.items, ...added], staleInteractions };
};

/** A canonical activation read acknowledges a token; it never invalidates the discussion again. */
export const updateContentVideoInteractionState = (
  state: ContentVideoInteractionState,
  key: string,
  patch: Partial<PostContentVideo>,
  revalidatedRevision?: number,
): ContentVideoInteractionState => {
  const target = state.items.find((item) => contentVideoKey(item) === key);
  if (!target) return state;
  if (
    revalidatedRevision !== undefined &&
    (state.staleInteractions[key] ?? 0) !== revalidatedRevision
  )
    return state;
  const countChanged =
    revalidatedRevision === undefined &&
    patch.descendants_count !== undefined &&
    patch.descendants_count !== (target.descendants_count ?? target.replies_count);
  const revision = state.revision + (countChanged ? 1 : 0);
  const staleInteractions = { ...state.staleInteractions };
  const items = state.items.map((item) => {
    if (item.post_id !== target.post_id) return item;
    const itemKey = contentVideoKey(item);
    if (
      itemKey === key ||
      (item.reply_id === target.reply_id && patch.descendants_count !== undefined)
    ) {
      // Multiple media items of an original post share the same discussion and interactions.
      if (patch.descendants_count !== undefined) delete staleInteractions[itemKey];
      return { ...item, ...patch };
    }
    if (countChanged) staleInteractions[itemKey] = revision;
    return item;
  });
  return {
    ...state,
    items,
    revision,
    staleInteractions,
    discussionRevisions: countChanged
      ? { ...state.discussionRevisions, [target.post_id]: revision }
      : state.discussionRevisions,
  };
};
