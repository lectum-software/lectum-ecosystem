import { randomBytes } from "node:crypto";

type Snapshot = {
  postId: string;
  focusReplyId: string | null;
  limit: number;
  ids: readonly string[];
  expiresAt: number;
};

export class ContentVideoCursorError extends Error {
  constructor(readonly reason: "invalid" | "expired" | "capacity") {
    super(`Content video cursor ${reason}`);
  }
}

/** Process-local, bounded, ID-only snapshots. Lost/evicted cursors fail explicitly, never reorder. */
export class ContentVideoCursorStore {
  private readonly snapshots = new Map<string, Snapshot>();
  private idsStored = 0;

  constructor(
    private readonly now = Date.now,
    private readonly ttlMs = 30 * 60 * 1000,
    private readonly maxSnapshots = 500,
    private readonly maxIds = 100_000,
  ) {}

  private remove(key: string) {
    const snapshot = this.snapshots.get(key);
    if (snapshot) this.idsStored -= snapshot.ids.length;
    this.snapshots.delete(key);
  }

  create(input: Omit<Snapshot, "expiresAt">) {
    if (input.ids.length > this.maxIds) throw new ContentVideoCursorError("capacity");
    for (const [key, value] of this.snapshots) {
      if (value.expiresAt <= this.now()) this.remove(key);
    }
    while (
      this.snapshots.size >= this.maxSnapshots ||
      this.idsStored + input.ids.length > this.maxIds
    ) {
      const oldest = this.snapshots.keys().next().value;
      if (!oldest) break;
      this.remove(oldest);
    }
    const key = randomBytes(24).toString("base64url");
    const snapshot = { ...input, ids: [...input.ids], expiresAt: this.now() + this.ttlMs };
    this.snapshots.set(key, snapshot);
    this.idsStored += snapshot.ids.length;
    return { key, snapshot };
  }

  resolve(
    cursor: string,
    scope: { postId: string; focusReplyId?: string; limit: number; page?: number },
  ) {
    const match = /^([A-Za-z0-9_-]{32})\.([1-9][0-9]{0,8})$/.exec(cursor);
    if (!match) throw new ContentVideoCursorError("invalid");
    const key = match[1]!;
    const offset = Number(match[2]);
    const snapshot = this.snapshots.get(key);
    if (!snapshot || snapshot.expiresAt <= this.now()) {
      this.remove(key);
      throw new ContentVideoCursorError("expired");
    }
    const page = offset / snapshot.limit + 1;
    if (
      snapshot.postId !== scope.postId ||
      snapshot.limit !== scope.limit ||
      (scope.focusReplyId !== undefined &&
        (scope.focusReplyId || null) !== snapshot.focusReplyId) ||
      offset >= snapshot.ids.length ||
      offset % snapshot.limit !== 0 ||
      (scope.page !== undefined && scope.page !== page)
    )
      throw new ContentVideoCursorError("invalid");
    return { key, snapshot, offset, page };
  }
}

export const contentVideoCursors = new ContentVideoCursorStore();
