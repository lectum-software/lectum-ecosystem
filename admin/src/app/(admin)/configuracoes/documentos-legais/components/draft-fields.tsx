"use client";

import { InputController, TextareaController } from "@/components/controllers";
import type { LegalDraftForm } from "../modules/legal-policy";

export const LegalDraftFields = ({ disabled }: { disabled: boolean }) => (
  <fieldset className="min-w-0 space-y-3" disabled={disabled}>
    <legend className="sr-only">Conteúdo do rascunho</legend>
    <InputController<LegalDraftForm> disabled={disabled} label="Título" name="title" required />
    <TextareaController<LegalDraftForm>
      disabled={disabled}
      label="Resumo das alterações"
      name="change_summary"
      rows={3}
      required
    />
    <p className="text-xs leading-5 text-muted">
      Título: 5 a 180 caracteres. Resumo: 10 a 2.000. Conteúdo: até 100.000; rascunhos podem ser
      incompletos, mas a publicação exige pelo menos 1.000 caracteres, sem marcadores em maiúsculas
      entre colchetes (como [CNPJ]) nem linhas iniciadas por Minuta ou Rascunho.
    </p>
    <TextareaController<LegalDraftForm>
      disabled={disabled}
      label="Conteúdo (texto simples ou Markdown)"
      name="body"
      rows={18}
      required
    />
  </fieldset>
);
