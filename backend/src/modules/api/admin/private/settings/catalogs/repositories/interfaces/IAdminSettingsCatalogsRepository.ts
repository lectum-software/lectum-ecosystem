import type { AdminSettingsCatalogsDTO } from "../../DTOs/IAdminSettingsCatalogsDTO";

export interface IAdminSettingsCatalogsRepository {
  listCatalogs(): Promise<AdminSettingsCatalogsDTO>;
}
