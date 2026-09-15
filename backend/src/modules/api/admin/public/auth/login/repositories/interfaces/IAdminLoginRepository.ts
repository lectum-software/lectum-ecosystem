import type { admin, admin_token } from "@/interfaces/objects";

export type AdminTokenLookup = {
  admin_id: string;
  device_id: string;
  token: string;
};

export interface IAdminLoginRepository {
  deleteToken(where: AdminTokenLookup): Promise<number>;
  findByEmail(email: string): Promise<admin | null>;
  hidrate(data: admin, device_id: string): Promise<admin>;
  tokenByDevice(where: AdminTokenLookup): Promise<admin_token | null>;
}
