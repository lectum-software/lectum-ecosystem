"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { AdminCommunityRule, AdminCommunityRuleInput } from "@/api/req/communities";
import { TextareaController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { type RuleFormValues, ruleFormSchema, toRulePayload } from "../modules/detail-support";

export const RuleEditForm = ({
  disabled,
  onCancel,
  onSubmit,
  rule,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  rule: AdminCommunityRule;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: rule.description,
    },
    resolver: zodResolver(ruleFormSchema),
  });
  const busy = disabled || form.formState.isSubmitting;
  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-3"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          if (busy) return;
          await onSubmit(values);
        })}
      >
        <TextareaController<RuleFormValues>
          disabled={busy}
          label="Texto da regra"
          name="description"
          required
          rows={3}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-control border border-border bg-surface px-4 text-sm font-black"
            disabled={busy}
            onClick={() => {
              if (!busy) onCancel();
            }}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-70"
            disabled={busy}
            type="submit"
          >
            Salvar regra
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export const RuleCreateModal = ({
  disabled,
  nextPosition,
  onClose,
  onSubmit,
  open,
}: {
  disabled: boolean;
  nextPosition: number;
  onClose: () => void;
  onSubmit: (input: AdminCommunityRuleInput) => Promise<boolean>;
  open: boolean;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: "",
    },
    resolver: zodResolver(ruleFormSchema),
  });
  const busy = disabled || form.formState.isSubmitting;
  const dialogRef = useAdminDialogLifecycle(onClose, {
    closeEnabled: !busy,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      form.reset({ description: "" });
    }
  }, [form, open]);

  if (!open) return null;

  return (
    <div
      aria-label="Criar nova regra"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-media-background/40 p-4 backdrop-blur-sm"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <FormProvider {...form}>
        <form
          className="w-full max-w-xl rounded-card border border-border bg-surface p-5 shadow-admin-soft"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            if (busy) return;
            const created = await onSubmit({ ...toRulePayload(values), position: nextPosition });
            if (created) {
              form.reset({ description: "" });
              onClose();
            }
          })}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-foreground">Criar nova regra</h3>
              <p className="mt-1 text-sm text-muted">Informe o texto exibido na comunidade.</p>
            </div>
          </div>
          <div className="mt-4">
            <TextareaController<RuleFormValues>
              disabled={busy}
              label="Texto da regra"
              name="description"
              placeholder="Digite a regra da comunidade"
              required
              rows={4}
            />
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="min-h-11 rounded-control border border-border bg-surface px-4 text-sm font-black"
              disabled={busy}
              onClick={() => {
                if (!busy) onClose();
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="min-h-11 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-70"
              disabled={busy}
              type="submit"
            >
              Criar regra
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
