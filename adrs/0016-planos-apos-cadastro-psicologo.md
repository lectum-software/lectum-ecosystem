# ADR-0016: Planos apos cadastro de psicologo

## Status

Accepted

## Contexto

O cadastro inicial do psicologo criava `psychologist_profile` real, mantinha
`crp_status="pendente"` e `published=false`, e encaminhava o usuario para a
jornada de CFP/CRP. O produto agora exige que, depois de passar pela tela de
cadastro profissional, o psicologo veja a selecao de plano antes da etapa de
validacao profissional.

O fluxo precisa atender os dois caminhos de cadastro:

- Google: o backend confirma a conta e o frontend recebe sessao real via
  `/api/public/google/me`.
- E-mail/senha: a conta nasce com `confirmed=false`; a verificacao de e-mail
  segue obrigatoria antes de liberar rotas privadas.

A tela de planos nao pode usar mock, seed artificial nem preco hardcoded fora da
fonte persistida. O provedor de pagamento ja foi decidido como Mercado Pago no
ADR-0003, mas o checkout real permanece reservado para a TASK-32 e depende de
credenciais reais.

## Decisao

- O destino canonico de home para `user.role="psicologo"` passa a ser
  `/app/professional/billing/plans`.
- Cadastro via Google redireciona diretamente para a selecao de plano, pois o
  usuario ja retorna confirmado.
- Cadastro via e-mail continua redirecionando primeiro para
  `/auth/verify-email`; depois da confirmacao, o mesmo resolvedor envia o
  psicologo para `/app/professional/billing/plans`.
- A tela de planos consome endpoints privados reais:
  - `GET /api/private/psychologist/billing/plans`;
  - `GET /api/private/psychologist/billing/current`.
- Os endpoints vivem sob `/api/private/psychologist/*` e sao protegidos por
  `_auth` + `requireRole("psicologo")`, fail-closed.
- Os modelos persistidos passam a ser a fonte de verdade para planos:
  - `subscription_plan` com slugs `gratuito` e `profissional`;
  - `professional_subscription` para a assinatura atual do psicologo quando ela
    existir.
- A migration insere os dois planos reais definidos pelo PRD/TASK-31
  (`gratuito` e `profissional`, R$ 9,90/mes em centavos no banco). O frontend
  formata preco a partir de `subscription_plan.price_cents`.
- O CTA do plano profissional nao simula checkout. Enquanto a TASK-32 nao estiver
  pronta com credenciais reais do Mercado Pago, ele registra pendencia visual ao
  usuario e nao cria cobranca nem assinatura ativa.

## Consequencias

- A ordem operacional do psicologo passa a ser: cadastro -> verificacao de
  e-mail quando necessaria -> selecao de plano -> CFP/CRP/CRP manual.
- A tela de planos existe antes do checkout e pode ser testada sem credenciais
  Mercado Pago porque e read-only.
- `professional_subscription.status` continua sendo a futura fonte de
  entitlement do Plano Profissional; nenhuma assinatura e ativada sem webhook ou
  confirmacao real do gateway.
- O plano gratuito pode encaminhar para a etapa de CFP atual sem persistir uma
  assinatura fake.

## Task relacionada

- Pedido direto de produto em 2026-06-05.
- TASK-31 - Planos de assinatura.
- ADR-0003 - Gateway de pagamento: Mercado Pago.

## Validacoes

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3012`: rota
  `/app/professional/billing/plans` retornou HTTP 200 com cookie de sessao de
  smoke.

## Atualização em 2026-06-05: planos sem cabeçalho privado

### Contexto

Produto solicitou remover o cabeçalho da página de planos e retirar o bloco visual de
`Pagamento seguro`, mantendo a tela focada na escolha entre os planos.

### Decisão

- `PrivateTemplate` agora aceita `showHeader`, com valor padrão `true`, para permitir
  páginas privadas sem cabeçalho sem criar outro shell/template.
- A rota `/app/professional/billing/plans` usa `showHeader={false}`.
- O bloco informativo `Pagamento seguro` foi removido da página de planos. A regra de
  checkout honesto permanece no CTA do plano profissional: sem TASK-32/credenciais reais,
  o clique informa pendência e não cria cobrança nem assinatura.

### Consequências

- Demais páginas privadas continuam exibindo o cabeçalho porque o padrão do template não
  mudou.
- A seleção de planos fica visualmente mais próxima do fluxo dedicado pós-cadastro.
- A remoção é apenas visual; contratos reais de planos e assinatura atual permanecem os
  mesmos.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
- Browser local com usuário psicólogo temporário validou ausência de `header`,
  `Dashboard`, `Sair` e do bloco `Pagamento seguro`. O usuário temporário foi removido
  do banco ao final.

## Atualizacao em 2026-06-07: fluxo planos -> telefone -> perfil

### Contexto

Produto redefiniu a jornada do psicologo depois do cadastro:

- Google ou e-mail confirmado sempre entram primeiro em `/app/professional/billing/plans`.
- Plano gratuito segue para validacao de telefone e depois configuracao do perfil.
- Plano pago segue para pagamento, endereco de faturamento, validacao de telefone,
  verificacao CRP e configuracao do perfil.

A parte paga continua limitada por dependencias reais: TASK-32 exige credenciais
Mercado Pago e TASK-18/TASK-11 ainda exigem documentos CRP privados. Portanto, o
fluxo nao pode fingir pagamento, endereco salvo, CRP aprovado ou perfil publicado.

### Decisao

- Remover o desvio automatico pos-login para `/psychologist/cfp`; o resolvedor de
  home do psicologo agora entra sempre pela tela de planos.
- Criar `POST /api/private/psychologist/billing/select-free` para persistir a
  escolha real do plano gratuito em `professional_subscription` com status
  `ativa`, sem gateway e sem cobrar.
- Proibir a troca para gratuito quando existir assinatura profissional ativa.
- Atualizar o CTA do plano gratuito para gravar a escolha e ir para
  `/app/professional/whatsapp/verify`.
- Atualizar a verificacao de telefone para continuar para:
  - `/app/professional/profile/setup` no plano gratuito;
  - `/psychologist/cfp` quando houver assinatura profissional ativa real, pois o
    endereco de faturamento ja deve ter sido coletado depois do pagamento.
- Criar telas honestas de bloqueio/continuidade em:
  - `/app/professional/billing/checkout` para explicar a pendencia Mercado Pago;
  - `/app/professional/billing/address` para reservar a etapa ao checkout real;
  - `/app/professional/profile/setup` para explicar que TASK-18 depende de CRP
    privado da TASK-11.

### Consequencias

- O cadastro do psicologo fica alinhado ao fluxo solicitado sem usar mock.
- A jornada gratuita e persistida no banco antes da validacao do telefone.
- A jornada paga fica roteada, mas bloqueada de forma explicita ate existirem
  credenciais/checkout reais; nenhuma assinatura profissional e ativada por UI.
- A configuracao final do perfil continua protegida ate a dependencia de CRP
  privado ser resolvida.

## Atualizacao em 2026-06-07: telas pós-plano sem navegação e endereço pós-pagamento

### Contexto

Produto solicitou dois ajustes no onboarding do psicólogo depois da tela de planos:

- remover a navegação inferior privada das telas de planos para frente;
- no plano profissional, coletar endereço de faturamento apenas depois da confirmação real do pagamento.

### Decisão

- Reutilizar `PrivateTemplate` sem criar shell paralelo: `showHeader={false}` agora também remove a navegação inferior e o padding reservado para ela.
- Aplicar o fluxo sem navegação às telas dedicadas de onboarding profissional: planos, checkout, endereço, verificação de WhatsApp e setup de perfil.
- Atualizar a ordem do plano profissional para `plano -> pagamento confirmado -> endereço -> telefone -> CRP -> perfil`.
- Manter o plano gratuito como `plano gratuito persistido -> WhatsApp -> perfil`.
- Sem credenciais Mercado Pago, a tela de checkout continua bloqueada honestamente e não ativa assinatura profissional.

### Consequências

- A navegação inferior deixa de cobrir CTAs de onboarding mobile-first, como o envio do código SMS.
- O endereço não é tratado como pré-requisito antes do pagamento; ele passa a ser etapa pós-confirmação de pagamento.
- Nenhuma cobrança, assinatura profissional, endereço, CRP ou perfil final é simulado.

## Atualizacao em 2026-06-07: plano gratuito sem CRP API

Por decisao de produto, psicologos no plano gratuito nao precisam validar CRP pela API antes de editar/configurar o perfil. A escolha do plano gratuito persiste a assinatura gratuita real e redireciona para `/app/professional/whatsapp/verify` antes de `/app/professional/profile/setup`. A validacao CFP/CRP automatica permanece apenas para fluxos que exigirem selo/assinatura profissional, sem mock ou preenchimento artificial de cfp_verified_at.

