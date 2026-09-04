export const canViewVideoAsset = ({
  hasPublishedAssociation,
  ownerId,
  viewerId,
}: {
  hasPublishedAssociation: boolean;
  ownerId: string;
  viewerId?: string | null;
}) => Boolean((viewerId && ownerId === viewerId) || hasPublishedAssociation);
