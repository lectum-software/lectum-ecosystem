//Objects
import type { user, user_token } from "@/interfaces/objects";
import type { IFindByEmailDTO } from "../../DTOs/IFindByEmailDTO";
//
import type { IFindToEmitDTO } from "../../DTOs/IFindToEmitDTO";
import type { IStoreDTO } from "../../DTOs/IStoreDTO";
import type { ITokenByDeviceDTO } from "../../DTOs/ITokenByDeviceDTO";
//DTOs
import type { IUpdateDTO } from "../../DTOs/IUpdateDTO";

export interface ILoginRepository {
  hidrate: (data: user, device_id: string) => Promise<user>;
  findByEmail: (data: IFindByEmailDTO) => Promise<user | null>;
  reactivateExpiredSuspension: (data: user) => Promise<user>;
  update: (data: IUpdateDTO) => Promise<user | null>;
  updateAndClearTokens: (data: IUpdateDTO) => Promise<user | null>;
  store: (data: IStoreDTO) => Promise<user | null>;
  tokenByDevice: (where: ITokenByDeviceDTO) => Promise<user_token | null>;
  //
  findToEmit: (data: IFindToEmitDTO) => Promise<user[] | null>;
}
