"use client";

import { Heart, UserRoundCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PrivateTemplate } from "@/templates/private";

export const FavoritesLogic = () => {
  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <InlineAlert title="Favoritos reservados" variant="info">
          A navegação já aponta para esta área, mas nenhum favorito é exibido sem persistência real.
        </InlineAlert>

        <EmptyState
          description="Perfis salvos e profissionais seguidos serão listados aqui quando a API de favoritos estiver disponível."
          icon={Heart}
          title="Nenhum favorito encontrado"
        />

        <EmptyState
          className="bg-surface-muted"
          description="A seção de seguindo também ficará vazia até receber dados reais."
          icon={UserRoundCheck}
          title="Nenhum perfil seguido"
        />
      </section>
    </PrivateTemplate>
  );
};
