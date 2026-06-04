export interface user_token {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  token?: string | null;
  device_id?: string | null;
  user?: user | null;
}

export interface user_background {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  type?: string | null;
  data?: unknown;
  device_id?: string | null;
  user?: user | null;
}

export interface notification_subscription {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  device_id?: string | null;
  user_id?: string | null;
  subscription?: unknown;
  user?: user | null;
}

export interface notification {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  read?: boolean | null;
  redirect?: string | null;
  message_key?: string | null;
  message_props?: unknown;
  user_id?: string | null;
  user?: user | null;
}

export interface notification_preference {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  user_id?: string | null;
  prefs?: unknown;
  user?: user | null;
}

export interface user {
  id?: string | null;
  deleted?: boolean | null;
  deletedAt?: Date | null;
  updatedAt?: Date | null;
  createdAt?: Date | null;
  name?: string | null;
  avatar?: string | null;
  provider?: string | null;
  role?: string | null;
  email?: string | null;
  password?: string | null;
  password_confirm?: string | null;
  active?: boolean | null;
  need_reset?: boolean | null;
  confirmed?: boolean | null;
  confirmed_date?: Date | null;
  recovery_code?: string | null;
  recovery_date?: Date | null;
  confirm_code?: string | null;
  confirm_date?: Date | null;
  user_tokens?: user_token[] | null;
  user_backgrounds?: user_background[] | null;
  notification_subscriptions?: notification_subscription[] | null;
  notifications?: notification[] | null;
  notification_preference?: notification_preference | null;
}
