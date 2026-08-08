"use client";
import { AlertTriangle, Eye, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminPatientAccount } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import {
  AccountChangeEmailForm,
  AccountPasswordResetForm,
  AccountRevokeSessionsForm,
  AccountSendEmailConfirmationForm,
  AccountTemporaryPasswordForm,
  AccountViewAsForm,
} from "../components/account-access-forms";
import { AccountStatusActionForm } from "../components/account-status";
import {
  ACCOUNT_STATUS_BADGE_CLASS,
  AccountLoadingState,
  AccountSummaryCard,
  AccountUnavailableNotice,
} from "../components/account-summary";
import { Badge, CardShell, ErrorState, IconCircle } from "../components/common";
import { FieldRow, InfoCard } from "../components/profile-summary";
import { numberFormatter } from "../modules/detail-config";
import { formatDateTime } from "../modules/detail-support";

export const AccountTab = ({ id }: { id: string }) => {
  const router = useRouter();
  const query = useAdminPatientAccount(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <AccountLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const account = query.data;
  const googleOnly = account.provider === "google" && !account.has_password;

  return (
    <div className="space-y-5" data-patient-detail-tab="conta">
      {googleOnly ? (
        <CardShell className="p-4">
          <div className="flex gap-3">
            <IconCircle icon={Lock} />
            <div>
              <h2 className="text-lg font-bold text-foreground">Conta Google sem senha local</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                Esta conta acessa via Google. Alteração ou criação de senha local estão
                indisponíveis.
              </p>
            </div>
          </div>
        </CardShell>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AccountSummaryCard account={account} />

        <InfoCard contentAsDescriptionList={false} icon={Mail} title="E-mail da conta">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
              Alterar o e-mail exige nova confirmação, envia uma mensagem de confirmação quando o
              serviço está disponível e encerra as sessões do paciente.
            </div>
            {!account.capabilities.can_change_email ? (
              <AccountUnavailableNotice>
                Alteração administrativa de e-mail bloqueada para identidade sem senha local.
              </AccountUnavailableNotice>
            ) : null}
            <AccountChangeEmailForm account={account} id={id} />
            <AccountSendEmailConfirmationForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard contentAsDescriptionList={false} icon={KeyRound} title="Senha e recuperação">
          <div className="grid gap-5">
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">
                Ação preferencial: link de redefinição
              </h3>
              <AccountPasswordResetForm account={account} id={id} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">
                Suporte excepcional: senha temporária
              </h3>
              <AccountTemporaryPasswordForm account={account} id={id} />
            </div>
          </div>
        </InfoCard>

        <InfoCard contentAsDescriptionList={false} icon={ShieldCheck} title="Sessões e segurança">
          <div className="grid gap-4">
            <dl>
              <FieldRow
                label="Sessões ativas"
                value={numberFormatter.format(account.sessions.active_count)}
              />
              <FieldRow
                label="Dispositivos"
                value={numberFormatter.format(account.sessions.devices_count)}
              />
              <FieldRow
                label="Última sessão"
                value={formatDateTime(account.sessions.last_access_at)}
              />
            </dl>
            <AccountRevokeSessionsForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <InfoCard contentAsDescriptionList={false} icon={Eye} title="Visualização administrativa">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
            Abre a experiência do paciente em modo somente leitura. A abertura é auditada e ações de
            alteração permanecem bloqueadas durante essa visualização.
          </div>
          <AccountViewAsForm account={account} id={id} />
        </div>
      </InfoCard>

      <InfoCard contentAsDescriptionList={false} icon={AlertTriangle} title="Ações da conta">
        <div className="grid gap-5">
          <dl>
            <FieldRow
              label="Status atual"
              value={
                <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
                  {account.account_status_label}
                </Badge>
              }
            />
            <FieldRow
              label="Última alteração de status"
              value={formatDateTime(account.account_status_changed_at)}
            />
            {account.account_status === "suspended" ? (
              <FieldRow
                label="Suspensa até"
                value={formatDateTime(account.account_status_expires_at)}
              />
            ) : null}
            <FieldRow
              label="Bloqueio para exclusão"
              value={account.delete_blocked_reason || "Nenhum bloqueio operacional identificado"}
            />
          </dl>
          <div className="grid gap-4 lg:grid-cols-3">
            <AccountStatusActionForm account={account} id={id} kind="suspend" />
            <AccountStatusActionForm account={account} id={id} kind="deactivate" />
            <AccountStatusActionForm
              account={account}
              id={id}
              kind="delete"
              onDeleted={() => router.push("/pacientes/lista")}
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
};
