"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useId, useRef } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";

const schema = z.object({
  necessary: z.literal(true),
  campaigns: z.boolean(),
  transfer: z.boolean(),
  experience: z.boolean(),
});

export function PrivacyPreferences({
  campaigns,
  googleAvailable = false,
  busy,
  error,
  onSave,
  onClose,
  canTransfer = false,
  transfer = false,
  experience = true,
  experienceAvailable = false,
}: {
  campaigns: boolean;
  googleAvailable?: boolean;
  busy: boolean;
  error: string | null;
  onSave: (
    campaigns: boolean,
    authorizeTransfer?: boolean,
    experience?: boolean,
    google?: boolean,
  ) => Promise<void>;
  experience?: boolean;
  experienceAvailable?: boolean;
  canTransfer?: boolean;
  transfer?: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLElement>(null);
  const { Form, hook, formProps } = useFormList({
    schema,
    defaultValues: {
      necessary: true as const,
      campaigns,
      transfer: canTransfer && transfer,
      experience,
    },
    fields: [
      {
        name: "necessary",
        field: "switch",
        label: "Cookies necessários",
        disabled: true,
        description: "Sempre ativos para acesso à conta, segurança e suas preferências.",
      },
      {
        name: "campaigns",
        field: "switch",
        label: googleAvailable
          ? "Medição de campanhas com Google e Meta"
          : "Medição de campanhas com a Meta",
        disabled: busy,
        description:
          "Opcional. Mede resultados de campanhas, como cadastros, contatos e assinaturas, usando dados de navegação. No Google, inclui as páginas e os nomes das comunidades visitadas, sem remarketing. Não envia seu nome, e-mail, telefone nem conteúdo de publicações. Só começa após seu aceite.",
      },
      ...(experienceAvailable
        ? [
            {
              name: "experience" as const,
              field: "switch" as const,
              label: "Análise de experiência",
              disabled: busy,
              description:
                "Opcional. Analisa cliques e navegação com reprodução de visitas e mapas de calor. Textos e campos são mascarados; áreas privadas e pagamentos ficam de fora.",
            },
          ]
        : []),
      ...(canTransfer
        ? [
            {
              name: "transfer" as const,
              field: "switch" as const,
              label: "Associar a origem das visitas à minha conta",
              disabled: busy,
              description:
                "Opcional. Vincula a origem das visitas à sua conta por até 90 dias, sem medir ações anteriores ao aceite.",
            },
          ]
        : []),
    ],
  });
  return (
    <Modal
      privacy
      open
      onClose={onClose}
      initialFocusRef={closeRef}
      returnFocusRef={returnRef}
      labelledBy={id}
    >
      <section
        className="max-h-[calc(100dvh-48px)] w-full max-w-lg overflow-y-auto rounded-[var(--lectum-auth-radius)] border border-border bg-surface p-5 shadow-lectum-soft sm:p-6"
        data-privacy-panel
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold" id={id}>
            Preferências de privacidade
          </h2>
          <button
            aria-label="Fechar preferências"
            title="Fechar preferências"
            className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 mt-2 text-sm leading-6 text-muted">
          Escolha o que permitir. Você pode mudar depois. Saiba mais na{" "}
          <Link href="/politica-de-privacidade" prefetch={false} className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <Form
          {...formProps}
          className="grid gap-5"
          onSubmit={hook.handleSubmit(async (values) => {
            if (!busy)
              await onSave(
                values.campaigns,
                canTransfer && values.campaigns && values.transfer,
                experienceAvailable ? values.experience : undefined,
                googleAvailable ? values.campaigns : undefined,
              );
          })}
        >
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="grid gap-2">
            <Button disabled={busy} type="submit">
              Salvar preferências
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-auto min-h-11 whitespace-normal"
                disabled={busy}
                variant="outline"
                type="button"
                onClick={() =>
                  void onSave(
                    false,
                    false,
                    experienceAvailable ? false : undefined,
                    googleAvailable ? false : undefined,
                  )
                }
              >
                Recusar opcionais
              </Button>
              <Button
                className="h-auto min-h-11 whitespace-normal"
                disabled={busy}
                variant="outline"
                type="button"
                onClick={() =>
                  void onSave(
                    true,
                    canTransfer,
                    experienceAvailable ? true : undefined,
                    googleAvailable ? true : undefined,
                  )
                }
              >
                Aceitar cookies
              </Button>
            </div>
          </div>
        </Form>
      </section>
    </Modal>
  );
}
