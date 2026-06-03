export type notification = {
  id?: string;
  read?: boolean;
  redirect?: string | null;
  message_key?: string | null;
  message_props?: unknown;
  user_id?: string;
  createdAt?: string;
  updatedAt?: string;
};
