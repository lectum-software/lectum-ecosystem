"use client";

import { Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminSeoMetadataImageUpload,
  useAdminSeoMetadataSettings,
  useAdminSeoMetadataUpdate,
} from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type { AdminSeoMetadataPageKey } from "@/api/req/settings";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { Form } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { OpenGraphImageField } from "./components/open-graph-image-field";
import { OpenGraphPreview, SearchPreview } from "./components/preview";

import { PageSelector, SettingsHeader, SummaryCards } from "./components/settings-overview";
import { TechnicalNotes } from "./components/technical-notes";
import { cardClass, robotsLabel } from "./modules/seo-support";
import {
  type SeoMetadataForm,
  toSeoMetadataFormValues,
  toSeoMetadataPayload,
  useSeoMetadataForm,
} from "./use-form";

export const AdminSeoMetadataClient = () => {
  const query = useAdminSeoMetadataSettings();
  const update = useAdminSeoMetadataUpdate();
  const uploadImage = useAdminSeoMetadataImageUpload();
  const [selectedKey, setSelectedKey] = useState<AdminSeoMetadataPageKey>("default");
  const form = useSeoMetadataForm();
  const { reset } = form;

  const settings = useMemo(() => query.data?.settings ?? [], [query.data?.settings]);
  const selectedSetting = useMemo(
    () => settings.find((setting) => setting.page_key === selectedKey) ?? settings[0],
    [selectedKey, settings],
  );

  useEffect(() => {
    if (!selectedSetting) return;

    reset(toSeoMetadataFormValues(selectedSetting));
  }, [reset, selectedSetting]);

  const watchedValues = form.watch();

  const handleOpenGraphImageUpload = async (file: File) => {
    if (!selectedSetting) return;

    try {
      const result = await uploadImage.mutateAsync({
        file,
        pageKey: selectedSetting.page_key,
      });
      form.setValue("og_image_url", result.og_image_url, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success("Imagem enviada. Salve os metadados para publicar a alteração.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const handleOpenGraphImageRemove = () => {
    form.setValue("og_image_url", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    toast.info("Imagem removida do formulário. Salve os metadados para publicar.");
  };

  const onSubmit: SubmitHandler<SeoMetadataForm> = async (values) => {
    if (!selectedSetting) return;

    try {
      await update.mutateAsync({
        input: toSeoMetadataPayload(values),
        pageKey: selectedSetting.page_key,
      });
      toast.success("Metadados de SEO salvos com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (query.isLoading) {
    return (
      <div className={cn(cardClass, "flex min-h-72 items-center justify-center p-8 text-muted")}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando metadados...
      </div>
    );
  }

  if (query.isError) {
    return <div className={cn(cardClass, "p-6 text-danger")}>{resolveApiError(query.error)}</div>;
  }

  return (
    <div className="min-w-0 space-y-6">
      <SettingsHeader />
      <SummaryCards settings={settings} />

      <div className="grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <PageSelector onSelect={setSelectedKey} selectedKey={selectedKey} settings={settings} />

        <section className={cn(cardClass, "min-w-0 p-4 md:p-6")}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Página selecionada
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                {selectedSetting?.label || "SEO"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {selectedSetting?.route_path || "Configuração padrão usada como fallback."}
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {robotsLabel(selectedSetting)}
            </span>
          </div>

          <Form className="space-y-4" form={form} onSubmit={onSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <InputController<SeoMetadataForm>
                label="Título SEO"
                maxLength={140}
                name="title"
                placeholder="Ex.: Psicólogos | Lectum"
                required
              />
              <InputController<SeoMetadataForm>
                label="URL canônica"
                name="canonical_url"
                placeholder="/psicologos ou https://lectum.com.br/psicologos"
              />
            </div>

            <TextareaController<SeoMetadataForm>
              label="Descrição SEO"
              name="description"
              placeholder="Resumo curto e claro para resultados de busca."
              required
              rows={4}
            />

            <InputController<SeoMetadataForm>
              label="Palavras-chave"
              name="keywords"
              placeholder="psicologia, terapia online, saúde mental"
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <InputController<SeoMetadataForm>
                label="Título Open Graph"
                maxLength={140}
                name="og_title"
                placeholder="Título para compartilhamento social"
              />
              <OpenGraphImageField
                disabled={!selectedSetting || update.isPending}
                isUploading={uploadImage.isPending}
                onRemove={handleOpenGraphImageRemove}
                onUpload={handleOpenGraphImageUpload}
                value={watchedValues.og_image_url}
                error={form.formState.errors.og_image_url?.message}
              />
            </div>

            <TextareaController<SeoMetadataForm>
              label="Descrição Open Graph"
              name="og_description"
              placeholder="Descrição usada em cards de compartilhamento."
              rows={3}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectController<SeoMetadataForm>
                label="Robots: index"
                name="robots_index"
                options={[
                  { label: "Indexar", value: "true" },
                  { label: "Não indexar", value: "false" },
                ]}
                required
              />
              <SelectController<SeoMetadataForm>
                label="Robots: follow"
                name="robots_follow"
                options={[
                  { label: "Seguir links", value: "true" },
                  { label: "Não seguir links", value: "false" },
                ]}
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted hover:text-foreground"
                disabled={update.isPending || uploadImage.isPending || !selectedSetting}
                onClick={() => reset(toSeoMetadataFormValues(selectedSetting))}
                type="button"
              >
                Descartar alterações
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
                disabled={update.isPending || uploadImage.isPending || !selectedSetting}
                type="submit"
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar metadados
              </button>
            </div>
          </Form>
        </section>
      </div>

      <div className="grid min-w-0 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        <SearchPreview setting={selectedSetting} values={watchedValues} />
        <OpenGraphPreview setting={selectedSetting} values={watchedValues} />
        <TechnicalNotes setting={selectedSetting} />
      </div>
    </div>
  );
};
