"use client";

import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePsychologistWhatsappVerification } from "@/api/callers/psychologist-whatsapp-verification";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  toWhatsappPhoneE164,
  useCodeForm,
  usePhoneForm,
  type WhatsappCodeForm,
  type WhatsappPhoneForm,
} from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type Step = "phone" | "code" | "success";

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;

  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "") ||
    "Não foi possível verificar o telefone agora."
  );
};

const formatDisplayPhone = (phone?: string | null) => {
  const digits = (phone || "").replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }

  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }

  return phone || "telefone informado";
};

const Header = ({ step }: { step: Step }) => (
  <header className="text-center">
    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
      {step === "success" ? (
        <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
      ) : (
        <MessageSquareText className="h-10 w-10" aria-hidden="true" />
      )}
    </div>
    <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
      Verificação por SMS
    </p>
    <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
      Confirme seu WhatsApp profissional
    </h1>
    <p className="mt-3 text-base leading-7 text-muted">
      O número só será liberado no contato com pacientes depois de um código SMS real confirmar a
      propriedade do telefone.
    </p>
  </header>
);

export const WhatsappVerificationLogic = () => {
  const user = useAppSelector((state) => state.user);
  const [step, setStep] = useState<Step>("phone");
  const [apiError, setApiError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const phoneForm = usePhoneForm(user?.psychologist_profile?.whatsapp);
  const codeForm = useCodeForm();
  const PhoneForm = phoneForm.Form;
  const CodeForm = codeForm.Form;

  const initialVerifiedAt = user?.psychologist_profile?.whatsapp_verified_at;
  const initialPhone = user?.psychologist_profile?.whatsapp;

  const isPsychologist = user?.role === "psicologo";
  const alreadyVerifiedLabel = useMemo(() => {
    if (!initialVerifiedAt || !initialPhone) return null;

    return formatDisplayPhone(initialPhone);
  }, [initialPhone, initialVerifiedAt]);

  const { request, confirm } = usePsychologistWhatsappVerification({
    callbacks: {
      request: {
        onSuccess: (data) => {
          setApiError(null);
          setVerifiedPhone(data.phone);

          if (data.already_verified) {
            setStep("success");
            toast.success("Telefone já verificado");
            return;
          }

          setVerificationId(data.verification_id);
          codeForm.hook.reset({ code: "" });
          setStep("code");
          toast.success("Código enviado por SMS");
        },
        onError: (error) => setApiError(resolveApiError(error)),
      },
      confirm: {
        onSuccess: (data) => {
          setApiError(null);
          setVerifiedPhone(data.phone);
          setStep("success");
          toast.success("Telefone verificado com sucesso");
        },
        onError: (error) => setApiError(resolveApiError(error)),
      },
    },
  });

  const submitPhone = phoneForm.hook.handleSubmit((values: WhatsappPhoneForm) => {
    setApiError(null);
    request.mutate({
      phone: toWhatsappPhoneE164(values.phone),
    });
  });

  const submitCode = codeForm.hook.handleSubmit((values: WhatsappCodeForm) => {
    if (!verificationId) {
      setApiError("Solicite um novo código para continuar.");
      setStep("phone");
      return;
    }

    setApiError(null);
    confirm.mutate({
      verification_id: verificationId,
      code: values.code,
    });
  });

  if (!user) {
    return (
      <PrivateTemplate>
        <section className="grid min-h-[55vh] place-items-center">
          <LoadingState label="Carregando sua sessão" />
        </section>
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/profile"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para perfil
        </Link>

        <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)]">
          <Header step={step} />

          {!isPsychologist ? (
            <InlineAlert className="mt-6" title="Perfil não autorizado" variant="warning">
              Esta verificação é exclusiva para psicólogos cadastrados na Lectum.
            </InlineAlert>
          ) : null}

          {alreadyVerifiedLabel && step === "phone" ? (
            <InlineAlert className="mt-6" title="WhatsApp atual verificado" variant="success">
              O número {alreadyVerifiedLabel} já possui confirmação por SMS real. Envie um novo
              código apenas se quiser alterar o telefone.
            </InlineAlert>
          ) : null}

          {apiError ? (
            <InlineAlert className="mt-6" title="Não foi possível verificar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          {step === "phone" ? (
            <PhoneForm className="mt-8 grid gap-5" {...phoneForm.formProps} onSubmit={submitPhone}>
              <InlineAlert title="Privacidade do número" variant="info">
                O telefone não aparece no perfil público. Ele só é usado no link de contato depois
                da confirmação e do registro da intenção do paciente.
              </InlineAlert>
              <Button
                className="h-14 w-full rounded-full text-base"
                disabled={!isPsychologist || request.isPending}
                type="submit"
              >
                {request.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Enviar código por SMS
              </Button>
            </PhoneForm>
          ) : null}

          {step === "code" ? (
            <CodeForm className="mt-8 grid gap-5" {...codeForm.formProps} onSubmit={submitCode}>
              <InlineAlert title="Código enviado" variant="success">
                Enviamos um SMS para {formatDisplayPhone(verifiedPhone)}. Digite o código para
                liberar o WhatsApp no fluxo de contato.
              </InlineAlert>
              <Button
                className="h-14 w-full rounded-full text-base"
                disabled={confirm.isPending}
                type="submit"
              >
                {confirm.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Confirmar telefone
              </Button>
              <Button
                disabled={request.isPending || confirm.isPending}
                onClick={() => {
                  setApiError(null);
                  setStep("phone");
                }}
                type="button"
                variant="ghost"
              >
                Alterar número ou reenviar código
              </Button>
            </CodeForm>
          ) : null}

          {step === "success" ? (
            <div className="mt-8 grid gap-5 text-center">
              <InlineAlert title="WhatsApp verificado" variant="success">
                O número {formatDisplayPhone(verifiedPhone || initialPhone)} foi confirmado por SMS
                e agora pode ser usado no contato com pacientes.
              </InlineAlert>
              <div className="flex items-center justify-center gap-2 rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted px-4 py-4 text-sm text-muted">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Confirmação salva com data/hora no perfil profissional.
              </div>
              <Button asChild className="h-12 rounded-full">
                <Link href="/app/profile">Voltar para meu perfil</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};
