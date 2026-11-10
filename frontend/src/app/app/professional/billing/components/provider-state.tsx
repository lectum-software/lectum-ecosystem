import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

export const BillingProviderState = ({
  loading = false,
  retry,
}: {
  loading?: boolean;
  retry?: () => void;
}) => (
  <PrivateTemplate showHeader={false}>
    <section className="mx-auto grid w-full max-w-[430px] gap-5 py-8">
      {loading ? (
        <LoadingState label="Carregando formulário seguro" />
      ) : (
        <InlineAlert title="Formulário de cartão indisponível" variant="warning">
          <p>
            Não foi possível abrir esta etapa agora. Confira sua assinatura antes de tentar
            novamente.
          </p>
          {retry ? (
            <Button className="mt-4 w-full" onClick={retry} type="button" variant="outline">
              Verificar novamente
            </Button>
          ) : null}
        </InlineAlert>
      )}
      <Button asChild variant="outline">
        <Link href="/app/profissional/assinatura">Minha assinatura</Link>
      </Button>
    </section>
  </PrivateTemplate>
);
