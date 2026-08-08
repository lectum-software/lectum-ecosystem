"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MessageCircleMore, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAdminCommunityCreate } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityCreateInput } from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { communityHeaderBackground, deriveCommunityVisualPalette } from "@/lib/community-visual";
import { cn } from "@/lib/utils";

const hexColor = /^#[0-9A-Fa-f]{6}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorMessage = "Use uma cor hexadecimal no formato #3300FF ou deixe em branco.";

const optionalColor = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || hexColor.test(value), colorMessage);

const communityCreateSchema = z.object({
  category: z.string().trim().max(80, "Use até 80 caracteres."),
  description: z.string().trim().max(500, "Use até 500 caracteres."),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome da comunidade.")
    .max(120, "Use até 120 caracteres."),
  slug: z
    .string()
    .trim()
    .max(100, "Use até 100 caracteres.")
    .refine(
      (value) => value.length === 0 || slugPattern.test(value),
      "Use apenas letras minúsculas, números e hífens.",
    ),
  visual_primary_color: optionalColor,
});

type CommunityCreateFormValues = z.infer<typeof communityCreateSchema>;

const defaultValues: CommunityCreateFormValues = {
  category: "",
  description: "",
  name: "",
  slug: "",
  visual_primary_color: "",
};

const nullableText = (value: string) => value.trim() || null;
const optionalText = (value: string) => value.trim() || undefined;

const toPayload = (values: CommunityCreateFormValues): AdminCommunityCreateInput => ({
  category: nullableText(values.category),
  description: nullableText(values.description),
  name: values.name.trim(),
  slug: optionalText(values.slug),
  visual_primary_color: nullableText(values.visual_primary_color),
});

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

const FieldHint = ({ children }: { children: ReactNode }) => (
  <p className="-mt-4 text-xs font-medium leading-5 text-muted">{children}</p>
);

export const AdminCommunityCreateClient = () => {
  const router = useRouter();
  const createMutation = useAdminCommunityCreate();
  const form = useForm<CommunityCreateFormValues>({
    defaultValues,
    mode: "onSubmit",
    resolver: zodResolver(communityCreateSchema),
  });
  const selectedPrimaryColor = useWatch({
    control: form.control,
    name: "visual_primary_color",
  });
  const selectedPalette = useMemo(
    () => deriveCommunityVisualPalette(selectedPrimaryColor),
    [selectedPrimaryColor],
  );

  const onSubmit = async (values: CommunityCreateFormValues) => {
    try {
      const community = await createMutation.mutateAsync(toPayload(values));
      toast.success("Comunidade criada com sucesso.");
      router.push(`/comunidades/${community.slug}?tab=dados`);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className={cn(cardClass, "p-5 md:p-6")}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Comunidades
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Criar nova comunidade
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Cadastre uma comunidade no catálogo público da plataforma.
            </p>
          </div>
          <Link
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-bold text-foreground shadow-control transition hover:border-primary hover:text-primary sm:w-auto"
            href="/comunidades/lista"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Voltar para lista
          </Link>
        </div>
      </header>

      <section className={cn(cardClass, "p-5 md:p-6")}>
        <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dados da comunidade</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-muted">
              A comunidade é criada ativa no modelo atual; avatar, regras e ajustes avançados podem
              ser editados no detalhe após salvar.
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <MessageCircleMore aria-hidden className="h-5 w-5" />
          </span>
        </div>

        <FormProvider {...form}>
          <form className="mt-6 grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 lg:grid-cols-2">
              <InputController<CommunityCreateFormValues>
                disabled={createMutation.isPending}
                label="Nome da comunidade"
                name="name"
                placeholder="Ansiedade em Equilíbrio"
                required
              />
              <InputController<CommunityCreateFormValues>
                disabled={createMutation.isPending}
                label="Slug público"
                name="slug"
                placeholder="ansiedade-em-equilibrio"
              />
            </div>
            <FieldHint>
              Deixe o slug em branco para gerar automaticamente a partir do nome.
            </FieldHint>

            <InputController<CommunityCreateFormValues>
              disabled={createMutation.isPending}
              label="Categoria"
              name="category"
              placeholder="Ansiedade"
            />
            <TextareaController<CommunityCreateFormValues>
              disabled={createMutation.isPending}
              label="Descrição"
              name="description"
              placeholder="Descreva o objetivo da comunidade"
              rows={4}
            />

            <div className="rounded-[1.5rem] border border-border bg-surface-muted/50 p-4">
              <h3 className="text-sm font-bold text-foreground">Identidade visual opcional</h3>
              <p className="mt-1 text-xs font-medium leading-5 text-muted">
                Informe apenas a cor principal. A Lectum gera automaticamente o header suave, textos
                e tons de apoio a partir dessa cor.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
                <div>
                  <InputController<CommunityCreateFormValues>
                    disabled={createMutation.isPending}
                    label="Cor da comunidade"
                    name="visual_primary_color"
                    placeholder="#FF8A2A"
                  />
                  <p className="-mt-4 text-xs font-medium leading-5 text-muted">
                    Deixe em branco para usar o azul padrão até o avatar definir a identidade
                    visual.
                  </p>
                </div>
                <div
                  className="overflow-hidden rounded-[1.35rem] border border-border shadow-control"
                  style={{
                    background: communityHeaderBackground(selectedPrimaryColor),
                  }}
                >
                  <div className="flex min-h-24 items-end gap-3 p-4">
                    <span
                      className="grid h-14 w-14 place-items-center rounded-[1.1rem] text-xs font-black text-primary-foreground ring-4 ring-primary-foreground/80"
                      style={{
                        background: selectedPalette.primaryColor,
                      }}
                    >
                      CO
                    </span>
                    <div>
                      <p
                        className="text-sm font-black"
                        style={{
                          color: selectedPalette.textColor,
                        }}
                      >
                        Previa do header
                      </p>
                      <p className="text-xs font-bold text-muted">tom suave derivado da cor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                href="/comunidades/lista"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-foreground shadow-control transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                disabled={createMutation.isPending}
                type="submit"
              >
                {createMutation.isPending ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden className="h-4 w-4" />
                )}
                Criar comunidade
              </button>
            </div>
          </form>
        </FormProvider>
      </section>
    </div>
  );
};
