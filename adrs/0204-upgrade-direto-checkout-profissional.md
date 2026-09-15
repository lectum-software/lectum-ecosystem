# ADR 0204 - Upgrade direto para checkout profissional

- **Status:** Accepted
- **Data:** 2026-07-04

## Task relacionada

TASK-33 - Gestão de assinatura e cartão

## Contexto

Na tela mobile-first de assinatura atual (`/app/professional/billing`), o psicólogo em Plano Gratuito via o CTA fixo **Fazer upgrade**. Esse CTA levava para `/app/professional/billing/plans`, obrigando o usuário a passar novamente pela seleção de plano antes de inserir os dados do cartão.

Como o CTA já expressa a intenção de upgrade para o Plano Profissional, a etapa de seleção cria fricção desnecessária. A rota de checkout (`/app/professional/billing/checkout`) já carrega o Plano Profissional real do backend, renderiza o Card Payment Brick do Mercado Pago e envia ao backend apenas o token de cartão.

## Decisão

O CTA **Fazer upgrade** da tela de assinatura passa a apontar diretamente para `PSYCHOLOGIST_ONBOARDING_PATHS.checkout`, ou seja, `/app/professional/billing/checkout`.

Atualização de 2026-08-13: a mesma regra passa a valer para o card azul
**Upgrade para o Plano Profissional** exibido no perfil privado do psicólogo (`/app/perfil`). Esse
card também usa `PSYCHOLOGIST_ONBOARDING_PATHS.checkout`, levando o psicólogo direto para
`/app/profissional/assinatura/pagamento`, enquanto o item explícito **Minha Assinatura** continua
abrindo a gestão da assinatura.

O fluxo resultante é:

1. Plano Gratuito ativo em `/app/professional/billing` ou no perfil privado do psicólogo;
2. clique em **Fazer upgrade**;
3. abertura imediata do checkout do Plano Profissional para inserir dados do cartão;
4. confirmação e ativação continuam dependentes do fluxo real Mercado Pago/webhook já existente.

Atualização de 2026-08-13: após o checkout receber confirmação de status aprovado do gateway ou
após a sincronização indicar assinatura profissional ativa, a tela de pagamento exibe o badge verde
**Pagamento bem-sucedido** antes de seguir para a etapa de endereço. O feedback visual reaproveita o
padrão da etapa de endereço e não altera a coleta segura do Card Payment Brick.

## Consequências

- Reduz uma etapa no funil de upgrade sem criar mock, seed ou assinatura artificial.
- Mantém a tela de planos disponível para quem explicitamente acessa `/app/professional/billing/plans`.
- Preserva a fonte real de preço/plano no checkout, sem hardcodar valores no CTA.
- A ação de voltar dentro do checkout ainda pode retornar para planos, mas a intenção primária do CTA não passa mais pela seleção.
- O usuário recebe confirmação visual de pagamento aprovado ainda na tela em que inseriu o cartão,
  reduzindo ambiguidade antes da navegação para o endereço.

## Validação

- Referências visuais locais consultadas: `_product/proto/Minhas Assinatura - Psicólogo.jpg` e `_product/proto/Finalizar Assinatura - Psicólogo.jpg`.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação de fonte: PowerShell confirmou `href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}` no CTA.
- Atualização de 2026-08-13: PowerShell confirmou o card de upgrade do perfil usando
  `href={PSYCHOLOGIST_ONBOARDING_PATHS.checkout}` e o item **Minha Assinatura** mantendo
  `/app/profissional/assinatura`.
- Atualização de 2026-08-13: smoke local com `next start -p 3208` confirmou `/app/perfil` com
  `200` e `/app/profissional/assinatura/pagamento` com `307` para login sem sessão.
- Atualização de 2026-08-13: validação de fonte confirmou `PaymentSuccessBadge`, reconhecimento
  de status aprovados e atraso curto no redirecionamento para o endereço quando o badge precisa ser
  exibido.
- Atualização de 2026-08-13: `pnpm --dir frontend check`, `pnpm --dir frontend build` e
  `pnpm check`.
- Atualização de 2026-08-13: smoke local com `next start -p 3212` confirmou `/version` com `200`,
  rota PT-BR de pagamento protegida por login e alias EN redirecionando para a rota PT-BR.
- Smoke local com `next start --port 3105`: `/app/professional/billing/checkout` retornou `307` para login sem sessão, preservando a proteção da rota privada; `/auth/login` retornou `200`.

## Pendências

- Nenhuma pendência externa nova. O checkout segue dependente das credenciais e webhooks reais do Mercado Pago já implementados nas tasks de billing.
