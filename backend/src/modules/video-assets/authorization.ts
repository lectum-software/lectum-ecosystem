export const canViewVideoAsset = ({
  hasPublishedAssociation,
  ownerId,
  viewerId,
}: {
  hasPublishedAssociation: boolean;
  ownerId: string;
  viewerId: string;
}) => ownerId === viewerId || hasPublishedAssociation;
