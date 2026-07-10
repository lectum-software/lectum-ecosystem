import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminSettingsKeys } from "@/api/cache/keys";
import {
  type AdminSettingsCatalogPayload,
  type AdminSettingsCatalogType,
  type AdminSettingsReorderPayload,
  createAdminCatalogItem,
  createAdminSpecialtyCategory,
  getAdminSettingsCatalogs,
  reorderAdminSettingsCatalog,
  restoreAdminSettingsCatalogDefaults,
  updateAdminCatalogItem,
  updateAdminSpecialtyCategory,
} from "@/api/req/settings";

export const useAdminSettingsCatalogs = () =>
  useQuery({
    queryFn: getAdminSettingsCatalogs,
    queryKey: adminSettingsKeys.catalogs(),
  });

const invalidateSettings = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.invalidateQueries({ queryKey: adminSettingsKeys.all });
};

export const useAdminSettingsCreateSpecialtyCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminSpecialtyCategory,
    onSuccess: () => invalidateSettings(queryClient),
  });
};

export const useAdminSettingsUpdateSpecialtyCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminSettingsCatalogPayload }) =>
      updateAdminSpecialtyCategory(id, input),
    onSuccess: () => invalidateSettings(queryClient),
  });
};

export const useAdminSettingsCreateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      type,
    }: {
      input: AdminSettingsCatalogPayload;
      type: Exclude<AdminSettingsCatalogType, "specialty_category">;
    }) => createAdminCatalogItem(type, input),
    onSuccess: () => invalidateSettings(queryClient),
  });
};

export const useAdminSettingsUpdateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
      type,
    }: {
      id: string;
      input: AdminSettingsCatalogPayload;
      type: Exclude<AdminSettingsCatalogType, "specialty_category">;
    }) => updateAdminCatalogItem(type, id, input),
    onSuccess: () => invalidateSettings(queryClient),
  });
};

export const useAdminSettingsReorderCatalog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminSettingsReorderPayload) => reorderAdminSettingsCatalog(input),
    onSuccess: () => invalidateSettings(queryClient),
  });
};

export const useAdminSettingsRestoreDefaults = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreAdminSettingsCatalogDefaults,
    onSuccess: () => invalidateSettings(queryClient),
  });
};
