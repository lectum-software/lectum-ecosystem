export type notification = {
  id?: string;
  read?: boolean;
  redirect?: string | null;
  message_key?: string | null;
  message_props?: unknown;
  user_id?: string;
  actor?: {
    id?: string | null;
    name: string;
    avatar?: string | null;
    role?: string | null;
    professional_label?: string | null;
    verified?: boolean | null;
    anonymous?: boolean | null;
    deleted?: boolean | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};
