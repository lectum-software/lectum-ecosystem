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
});

export function PrivacyPreferences({
  campaigns,
  busy,
  error,
  onSave,
  onClose,
  canTransfer = false,
  transfer = false,
}: {
  campaigns: boolean;
  busy: boolean;
  error: string | null;
  onSave: (campaigns: boolean, authorizeTransfer?: boolean) => Promise<void>;
  canTransfer?: boolean;
  transfer?: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLElement>(null);
  const { Form, hook, formProps } = useFormList({
    schema,
    defaultValues: { necessary: true as const, campaigns, transfer: canTransfer && transfer },
    fields: [
      {
        name: "necessary",
        field: "switch",
        label: "Cookies necessários",
        disabled: true,
        description:
          "Sempre ativos. Permitem o acesso à conta, a segurança e o armazenamento das suas preferências.",
      },
      {
        name: "campaigns",
        field: "switch",
        label: "Medição de campanhas com a Meta",
        disabled: busy,
        description:
          "Opcional. Compartilha com a Meta a confirmação de cadastro, clique no WhatsApp, publicação em fórum e primeira assinatura profissional paga, com data, endereço da página, identificador do navegador, endereço IP e informações do navegador e sistema operacional. Não envia nome, e-mail ou telefone. No cadastro, informa se a conta é de usuário comum ou profissional. Valor e moeda são enviados apenas na assinatura paga. Não inclui identidade do profissional contatado, tema ou conteúdo da publicação, informações clínicas ou dados do cartão. Aceite antes da ação; não há medição retroativa. Você pode recusar ou revogar nas preferências; revogar interrompe novos envios, mas não apaga dados já enviados.",
      },
      ...(canTransfer
        ? [
            {
              name: "transfer" as const,
              field: "switch" as const,
              label: "Associar a origem das visitas à minha conta",
              disabled: busy,
              description:
                "Opcional. Autoriza associar a origem das visitas à sua conta por até 90 dias para medir essas ações. Antes do cadastro, a origem é mantida por até 30 dias. Aceitar depois do cadastro não autoriza medir esse cadastro retroativamente.",
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
          Você pode aceitar, recusar ou alterar sua escolha a qualquer momento na{" "}
          <Link href="/politica-de-privacidade" prefetch={false} className="underline">
            Política de Privacidade
          </Link>
          . Aceitar cookies aceita todas as opções apresentadas; Salvar preferências mantém apenas
          as opções selecionadas.
        </p>
        <Form
          {...formProps}
          className="grid gap-5"
          onSubmit={hook.handleSubmit(async (values) => {
            if (!busy)
              await onSave(values.campaigns, canTransfer && values.campaigns && values.transfer);
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
                onClick={() => void onSave(false)}
              >
                Recusar opcionais
              </Button>
              <Button
                className="h-auto min-h-11 whitespace-normal"
                disabled={busy}
                variant="outline"
                type="button"
                onClick={() => void onSave(true, canTransfer)}
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
