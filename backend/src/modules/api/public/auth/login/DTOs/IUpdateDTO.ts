import type { user } from "@/interfaces/objects";

export interface IUpdateDTO {
  p: {
    id: string;
  };
  b: {
    name?: string;
    avatar?: string | null;
    provider?: string;
    password?: string;
    password_confirm?: string;
    confirmed?: boolean;
    confirmed_date?: Date | null;
    recovery_code?: string | null;
    recovery_date?: Date | null;
    confirm_code?: string | null;
    need_reset?: boolean;
  };
  auth: user;
}
