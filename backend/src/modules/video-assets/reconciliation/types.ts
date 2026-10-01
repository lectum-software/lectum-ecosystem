export type ReconcileVideoUploadOptions = {
  assetId?: string;
  ownerId?: string;
  apply: boolean;
  confirmation: "homolog" | "production" | null;
  limit: number;
  offset: number;
};
