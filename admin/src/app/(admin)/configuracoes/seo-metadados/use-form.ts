import { z } from "zod";
import type { AdminSeoMetadataPayload, AdminSeoMetadataSetting } from "@/api/req/settings";
import { type Field, useFormList } from "@/hooks/form";

const optionalPathOrUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(600, `${label} deve ter no máximo 600 caracteres`)
    .refine(
      (value) => {
        if (!value) return true;
        if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");

        try {
          const url = new URL(value);

          return (
            (url.protocol === "https:" || url.protocol === "http:") &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      },
      { message: `${label} deve ser uma URL completa ou um caminho iniciado por /` },
    );

export const seoMetadataSchema = z.object({
  canonical_url: optionalPathOrUrl("URL canônica"),
  description: z
    .string()
    .trim()
    .min(20, "Informe pelo menos 20 caracteres")
    .max(360, "A descrição deve ter no máximo 360 caracteres"),
  keywords: z.string().trim().max(600, "Use no máximo 600 caracteres em palavras-chave"),
  og_description: z
    .string()
    .trim()
    .max(360, "A descrição Open Graph deve ter no máximo 360 caracteres"),
  og_image_url: optionalPathOrUrl("Imagem Open Graph"),
  og_title: z.string().trim().max(140, "O título Open Graph deve ter no máximo 140 caracteres"),
  robots_follow: z.enum(["true", "false"]),
  robots_index: z.enum(["true", "false"]),
  title: z
    .string()
    .trim()
    .min(5, "Informe pelo menos 5 caracteres")
    .max(140, "O título deve ter no máximo 140 caracteres"),
});

export type SeoMetadataForm = z.infer<typeof seoMetadataSchema>;

const fields = [
  {
    name: "title",
    field: "input",
    label: "Título SEO",
    placeholder: "Título exibido nos resultados de busca",
    required: true,
  },
  {
    name: "description",
    field: "input",
    label: "Descrição SEO",
    placeholder: "Resumo exibido nos mecanismos de busca",
    required: true,
  },
] satisfies Field<SeoMetadataForm>[];

export const emptySeoMetadataFormValues: SeoMetadataForm = {
  canonical_url: "",
  description: "",
  keywords: "",
  og_description: "",
  og_image_url: "",
  og_title: "",
  robots_follow: "true",
  robots_index: "true",
  title: "",
};

export const toSeoMetadataFormValues = (setting?: AdminSeoMetadataSetting): SeoMetadataForm => {
  if (!setting) return emptySeoMetadataFormValues;

  return {
    canonical_url: setting.canonical_url ?? "",
    description: setting.description,
    keywords: setting.keywords.join(", "),
    og_description: setting.og_description ?? "",
    og_image_url: setting.og_image_url ?? "",
    og_title: setting.og_title ?? "",
    robots_follow: setting.robots_follow ? "true" : "false",
    robots_index: setting.robots_index ? "true" : "false",
    title: setting.title,
  };
};

const nullable = (value: string) => {
  const normalized = value.trim();

  return normalized ? normalized : null;
};

export const toSeoMetadataPayload = (values: SeoMetadataForm): AdminSeoMetadataPayload => ({
  canonical_url: nullable(values.canonical_url),
  description: values.description.trim(),
  keywords: values.keywords.trim(),
  og_description: nullable(values.og_description),
  og_image_url: nullable(values.og_image_url),
  og_title: nullable(values.og_title),
  robots_follow: values.robots_follow === "true",
  robots_index: values.robots_index === "true",
  title: values.title.trim(),
});

export const useSeoMetadataForm = () =>
  useFormList<SeoMetadataForm>({
    defaultValues: emptySeoMetadataFormValues,
    fields,
    schema: seoMetadataSchema,
  });
