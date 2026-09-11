import type { Query, QueryClient } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type {
  PostDetail,
  PostDetailResponse,
  PostRepliesResponse,
  PostReply,
  PostReplyThreadResponse,
  PostVoteResponse,
} from "@/api/generator/types/posts";

type Target = { postId: string; replyId?: string; kind: "vote" | "save" };
type Entity = PostDetail | PostReply;
type CacheData = PostDetailResponse | PostRepliesResponse | PostReplyThreadResponse;
type Fields = Partial<
  Pick<
    PostDetail,
    "current_user_vote" | "upvotes_count" | "downvotes_count" | "saved" | "saves_count"
  >
>;
type Snapshot = { query: Query; before: Fields; optimistic: Fields };
type Scope = { current?: PostInteraction; pending: number };

export type PostInteraction = {
  target: Target;
  key: string;
  scope: Scope;
  previous?: PostInteraction;
  snapshots: Snapshot[];
  status: "pending" | "success" | "error";
  response?: Fields;
};

// Shared across hook instances, but never across QueryClients (sessions/SSR requests).
// Only overlapping operations are retained; a completed scope is released.
const scopes = new WeakMap<QueryClient, Map<string, Scope>>();

const filters = (target: Target) =>
  target.replyId
    ? [
        ["posts", target.postId, "replies"],
        ["posts", target.postId, "reply-thread"],
      ]
    : [keys.posts.detail(target.postId)];

const queries = (client: QueryClient, target: Target) =>
  filters(target).flatMap((queryKey) => client.getQueryCache().findAll({ queryKey }));

const fields = (entity: Entity, target: Target): Fields =>
  target.kind === "vote"
    ? {
        current_user_vote: entity.current_user_vote,
        upvotes_count: entity.upvotes_count,
        downvotes_count: entity.downvotes_count,
      }
    : {
        saved: entity.saved,
        ...("saves_count" in entity ? { saves_count: entity.saves_count } : {}),
      };

const matches = (entity: Entity, expected: Fields) =>
  Object.entries(expected).every(([key, value]) => entity[key as keyof Entity] === value);

const mapReplies = (
  replies: PostReply[],
  replyId: string,
  update: (entity: Entity) => Entity,
): PostReply[] => {
  let changed = false;
  const next = replies.map((reply) => {
    const children = mapReplies(reply.replies, replyId, update);
    const updated = reply.id === replyId ? (update(reply) as PostReply) : reply;
    const result = children === reply.replies ? updated : { ...updated, replies: children };
    changed ||= result !== reply;
    return result;
  });
  return changed ? next : replies;
};

const mapTarget = (
  data: CacheData | undefined,
  target: Target,
  update: (entity: Entity) => Entity,
): CacheData | undefined => {
  if (!data) return data;
  if (!target.replyId) {
    if (!("post" in data) || data.post.id !== target.postId) return data;
    const post = update(data.post) as PostDetail;
    return post === data.post ? data : { ...data, post };
  }
  if ("data" in data) {
    const replies = mapReplies(data.data, target.replyId, update);
    return replies === data.data ? data : { ...data, data: replies };
  }
  if ("reply" in data) {
    const [reply] = mapReplies([data.reply], target.replyId, update);
    return reply === data.reply ? data : { ...data, reply };
  }
  return data;
};

export const beginPostInteraction = async (
  client: QueryClient,
  target: Target,
  optimistic: (entity: Entity) => Fields,
): Promise<PostInteraction> => {
  await Promise.all(filters(target).map((queryKey) => client.cancelQueries({ queryKey })));
  let clientScopes = scopes.get(client);
  if (!clientScopes) {
    clientScopes = new Map();
    scopes.set(client, clientScopes);
  }
  const key = JSON.stringify([target.postId, target.replyId ?? null, target.kind]);
  const scope = clientScopes.get(key) ?? { pending: 0 };
  const operation: PostInteraction = {
    target,
    key,
    scope,
    previous: scope.current,
    snapshots: [],
    status: "pending",
  };
  scope.current = operation;
  scope.pending += 1;
  clientScopes.set(key, scope);

  for (const query of queries(client, target)) {
    client.setQueryData<CacheData>(query.queryKey, (data) =>
      mapTarget(data, target, (entity) => {
        const patch = optimistic(entity);
        operation.snapshots.push({ query, before: fields(entity, target), optimistic: patch });
        return { ...entity, ...patch };
      }),
    );
  }
  return operation;
};

const release = (client: QueryClient, operation: PostInteraction) => {
  operation.scope.pending -= 1;
  if (operation.scope.pending === 0) {
    const clientScopes = scopes.get(client);
    clientScopes?.delete(operation.key);
    if (clientScopes?.size === 0) scopes.delete(client);
  }
};

// A later failed operation must not restore an earlier failed optimistic value.
// A pending/successful predecessor remains a valid base until authoritative refetch.
const rollbackFields = (operation: PostInteraction, snapshot: Snapshot): Fields => {
  let before = snapshot.before;
  let previous = operation.previous;
  while (previous) {
    const previousSnapshot = previous.snapshots.find((item) => item.query === snapshot.query);
    // A predecessor from another cache lifetime cannot supply this query's base.
    if (!previousSnapshot) return before;
    if (previous.status !== "error") {
      return {
        ...previousSnapshot.optimistic,
        ...(previous.status === "success" ? previous.response : {}),
      };
    }
    before = previousSnapshot.before;
    previous = previous.previous;
  }
  return before;
};

export const rollbackPostInteraction = (
  client: QueryClient,
  operation: PostInteraction | undefined,
) => {
  if (operation?.status !== "pending") return;
  operation.status = "error";
  if (operation.scope.current === operation) {
    let previous = operation.previous;
    while (previous?.status === "error") previous = previous.previous;
    operation.scope.current = previous;
    for (const snapshot of operation.snapshots) {
      // Never resurrect a removed query or write a snapshot into a recreated query.
      if (client.getQueryCache().get(snapshot.query.queryHash) !== snapshot.query) continue;
      client.setQueryData<CacheData>(snapshot.query.queryKey, (data) =>
        mapTarget(data, operation.target, (entity) =>
          matches(entity, snapshot.optimistic)
            ? { ...entity, ...rollbackFields(operation, snapshot) }
            : entity,
        ),
      );
    }
  }
  release(client, operation);
};

export const commitPostInteraction = (
  client: QueryClient,
  operation: PostInteraction | undefined,
  response: Fields,
  receipt: Pick<PostVoteResponse, "post_id" | "reply_id" | "target_type">,
) => {
  if (operation?.status !== "pending") return;
  if (
    receipt.post_id !== operation.target.postId ||
    receipt.reply_id !== (operation.target.replyId ?? null) ||
    receipt.target_type !== (operation.target.replyId ? "reply" : "post")
  ) {
    rollbackPostInteraction(client, operation);
    return;
  }
  operation.status = "success";
  operation.response = response;
  if (operation.scope.current === operation) {
    // Receipts belong to the cache lifetime observed at begin, not queries created
    // after clear/remove (for example, a different viewer on the same QueryClient).
    // New queries are reconciled by the caller's onSettled invalidation/refetch.
    for (const { query } of operation.snapshots) {
      if (client.getQueryCache().get(query.queryHash) !== query) continue;
      client.setQueryData<CacheData>(query.queryKey, (data) =>
        mapTarget(data, operation.target, (entity) => ({ ...entity, ...response })),
      );
    }
  }
  release(client, operation);
};
