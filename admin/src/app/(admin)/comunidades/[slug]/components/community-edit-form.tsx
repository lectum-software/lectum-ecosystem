"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAdminCommunityAvatarUpload, useAdminCommunityUpdate } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityIdentity } from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { communityHeaderBackground, deriveCommunityVisualPalette } from "@/lib/community-visual";
import { cn } from "@/lib/utils";

import {
  type CommunityFormValues,
  cardClass,
  communityFormSchema,
  defaultCommunityValues,
  initials,
  toCommunityPayload,
} from "../modules/detail-support";

export const CommunityEditForm = ({
  community,
  id,
  onDone,
}: {
  community: AdminCommunityIdentity;
  id: string;
  onDone: () => void;
}) => {
  const updateMutation = useAdminCommunityUpdate(id);
  const avatarMutation = useAdminCommunityAvatarUpload(id);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<CommunityFormValues>({
    defaultValues: defaultCommunityValues(community),
    mode: "onSubmit",
    resolver: zodResolver(communityFormSchema),
  });

  useEffect(() => {
    form.reset(defaultCommunityValues(community));
  }, [community, form]);

  const selectedPrimaryColor = useWatch({
    control: form.control,
    name: "visual_primary_color",
  });
  const selectedPalette = useMemo(
    () => deriveCommunityVisualPalette(selectedPrimaryColor || community.visual_primary_color),
    [community.visual_primary_color, selectedPrimaryColor],
  );
  const onSubmit = async (values: CommunityFormValues) => {
    try {
      await updateMutation.mutateAsync(toCommunityPayload(values));
      toast.success("Comunidade atualizada.");
      onDone();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await avatarMutation.mutateAsync(file);
      toast.success("Avatar atualizado com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className={cn(cardClass, "p-5")}>
      <h2 className="text-lg font-black text-foreground">Editar identidade da comunidade</h2>

      <FormProvider {...form}>
        <form className="mt-5 grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex justify-start">
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onAvatarChange}
              ref={fileRef}
              type="file"
            />
            <button
              aria-label="Editar avatar da comunidade"
              className="relative h-32 w-32 rounded-[1.85rem] outline-none transition focus-visible:ring-4 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-70"
              disabled={avatarMutation.isPending}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <span
                className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-[1.85rem] text-3xl font-black text-primary-foreground ring-4 ring-primary-soft"
                style={{
                  background: selectedPalette.primaryColor,
                }}
              >
                {community.avatar_url ? (
                  <Image
                    alt={`Avatar da comunidade ${community.name}`}
                    className="object-cover"
                    fill
                    sizes="128px"
                    src={community.avatar_url}
                    unoptimized
                  />
                ) : (
                  initials(community.name)
                )}
              </span>
              <span className="absolute right-1 bottom-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-surface shadow-admin-soft transition">
                {avatarMutation.isPending ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 aria-hidden className="h-4 w-4" />
                )}
              </span>
            </button>
          </div>
          <InputController<CommunityFormValues>
            label="Nome da comunidade"
            name="name"
            placeholder="Nome"
            required
          />
          <TextareaController<CommunityFormValues>
            label="Descrição"
            name="description"
            placeholder="Descreva o objetivo da comunidade"
            rows={4}
          />
          <div className="rounded-[1.5rem] border border-border bg-surface-muted/45 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
              <div>
                <InputController<CommunityFormValues>
                  label="Cor da comunidade"
                  name="visual_primary_color"
                  placeholder="#FF8A2A"
                />
                <p className="-mt-4 text-xs font-medium leading-5 text-muted">
                  Configure apenas a cor principal. Header, tons suaves, texto e chips sao gerados
                  automaticamente a partir dela para manter contraste e consistencia.
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
                    {initials(community.name)}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground"
              onClick={onDone}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary-hover disabled:opacity-70"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden className="h-4 w-4" />
              )}
              Salvar alterações
            </button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
};
