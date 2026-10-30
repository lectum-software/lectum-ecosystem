export const canInvitePostAuthorToTestify = ({
  currentUserId,
  currentUserRole,
  postAuthorId,
  reply,
}: {
  currentUserId?: string | null;
  currentUserRole?: string | null;
  postAuthorId?: string | null;
  reply: {
    parent_reply_id: string | null;
    media_url: string | null;
    media_type: string | null;
    author: { id: string; role: string | null };
  };
}) =>
  Boolean(
    currentUserId &&
      postAuthorId &&
      currentUserId === postAuthorId &&
      currentUserRole === "paciente" &&
      reply.parent_reply_id === null &&
      reply.author.role === "psicologo" &&
      reply.author.id &&
      reply.author.id !== currentUserId &&
      reply.media_url &&
      reply.media_type === "video",
  );
