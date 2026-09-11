import { z } from "zod";

export const DELETE_CONFIRMATION = "EXCLUIR CATALOGO";

export const formSchema = z.object({
  active: z.enum(["true", "false"], { error: "Selecione um status válido." }),
  category_id: z.string({ error: "Selecione uma categoria válida." }).optional(),
  name: z
    .string({ error: "Informe o nome." })
    .trim()
    .min(2, "Informe pelo menos 2 caracteres")
    .max(160, "Use no máximo 160 caracteres."),
});

export type CatalogForm = z.infer<typeof formSchema>;

export const deleteSchema = z.object({
  confirmation: z.string().refine((value) => value.trim().toUpperCase() === DELETE_CONFIRMATION, {
    message: `Digite ${DELETE_CONFIRMATION} para confirmar`,
  }),
});

export type DeleteForm = z.infer<typeof deleteSchema>;
