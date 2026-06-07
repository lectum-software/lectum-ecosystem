import { z } from "zod";
import type { FreeProfessionalProfile } from "@/api/generator/types/free-profile";
import { type Field, useFormList } from "@/hooks/form";

export type FreeProfileForm = {
  name: string;
  headline: string;
  bio: string;
  modality: "online" | "presencial" | "hibrido" | "";
  languagesText: string;
  published: boolean;
  specialty_ids: string[];
  service_ids: string[];
  approach_ids: string[];
};

export const freeProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome profissional").max(120),
  headline: z.string().trim().min(3, "Informe um título profissional").max(160),
  bio: z.string().trim().min(20, "Escreva uma bio com pelo menos 20 caracteres").max(2000),
  modality: z.enum(["online", "presencial", "hibrido", ""], {
    message: "Selecione a modalidade",
  }),
  languagesText: z.string().trim().min(2, "Informe ao menos um idioma"),
  published: z.boolean(),
  specialty_ids: z.array(z.string()),
  service_ids: z.array(z.string()),
  approach_ids: z.array(z.string()),
});

export const fields = [
  {
    name: "name",
    field: "input",
    label: "Nome profissional",
    placeholder: "Seu nome como aparecerá no perfil",
    required: true,
    autoComplete: "name",
  },
  {
    name: "headline",
    field: "input",
    label: "Título do perfil",
    placeholder: "Ex.: Psicóloga clínica para ansiedade",
    description: "Frase curta exibida na listagem e no perfil público.",
    required: true,
  },
  {
    name: "bio",
    field: "textarea",
    label: "Bio profissional",
    placeholder: "Conte sua abordagem, experiência e como você ajuda pacientes.",
    required: true,
    rows: 6,
  },
  {
    name: "modality",
    field: "select",
    label: "Modalidade",
    required: true,
    options: [
      { label: "Online", value: "online" },
      { label: "Presencial", value: "presencial" },
      { label: "Híbrido", value: "hibrido" },
    ],
  },
  {
    name: "languagesText",
    field: "input",
    label: "Idiomas",
    placeholder: "Português, Inglês",
    description: "Separe por vírgula.",
    required: true,
  },
] satisfies Field<FreeProfileForm>[];

const toLanguagesText = (languages?: string[]) => (languages || []).join(", ");

export const parseLanguages = (value: string) => {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

export const getDefaultValues = (data?: FreeProfessionalProfile | null): FreeProfileForm => ({
  name: data?.user.name || "",
  headline: data?.profile.headline || "",
  bio: data?.profile.bio || "",
  modality: (data?.profile.modality as FreeProfileForm["modality"]) || "",
  languagesText: toLanguagesText(data?.profile.languages),
  published: Boolean(data?.profile.published),
  specialty_ids: data?.selected.specialties.map((item) => item.id) || [],
  service_ids: data?.selected.services.map((item) => item.id) || [],
  approach_ids: data?.selected.approaches.map((item) => item.id) || [],
});

export const useFreeProfileForm = (data?: FreeProfessionalProfile | null) => {
  const defaults = getDefaultValues(data);

  return useFormList<FreeProfileForm>({
    fields,
    schema: freeProfileSchema,
    defaultValues: defaults,
    values: defaults,
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
  });
};
