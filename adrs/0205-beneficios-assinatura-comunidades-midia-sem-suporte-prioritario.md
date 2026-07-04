# ADR-0205: Benefícios da assinatura com mídia nas comunidades e sem suporte prioritário

## Status

Accepted

## Task relacionada

TASK-31 e TASK-31B

## Contexto

O produto solicitou um ajuste direto na área de assinatura profissional exibida em
`/app/professional/billing`: remover o benefício `Atendimento prioritário` e reforçar o grupo
`Mais visibilidade` com o benefício de respostas nas comunidades com mídia.

A mesma lista de valor aparece também na tela de planos em `/app/professional/billing/plans`, então
manter as duas telas alinhadas evita divergência comercial entre a tela de conversão e a tela de
gestão da assinatura.

As referências visuais ativas consultadas foram `_product/proto/Minhas Assinatura - Psicólogo.jpg`,
`_product/proto/Planos de Assinatura.jpg` e o print enviado pelo usuário. O Builder Quick Copy não
está exposto como ferramenta direta neste ambiente; por isso a validação visual usou as imagens
locais, o print e browser local via Chrome/CDP.

## Decisão

- Remover o card/grupo `Atendimento prioritário` da seção `O que você desbloqueia com a Assinatura
  Profissional`.
- Remover `Suporte prioritário via WhatsApp` da comparação dos planos gratuito/profissional.
- Adicionar `Respostas nas comunidades com mídia` ao conjunto de benefícios de visibilidade:
  - como item dentro do grupo `Mais visibilidade` em `/app/professional/billing`;
  - como item incluído no Plano Profissional e indisponível no Plano Gratuito em
    `/app/professional/billing/plans`.
- Não alterar contratos de API, regras de gateway, entitlement, preço, schema Prisma ou pacotes.

## Consequências

- A proposta de valor fica mais aderente ao diferencial já implementado de mídia em respostas
  profissionais nas comunidades.
- A UI deixa de prometer um canal operacional de suporte prioritário que não deve ser vendido como
  benefício neste momento.
- A remoção de um card reduz a altura da tela mobile e mantém a composição sem overflow em 390px.
- A decisão é apenas de copy/posicionamento comercial; não cria novo entitlement técnico.

## Validação

- `pnpm --dir frontend exec biome check --write src/app/app/professional/billing/subscription/logic.tsx src/app/app/professional/billing/plans/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `http://localhost:3000/app/professional/billing`, viewport
  `390x844`, com psicólogo temporário criado por endpoint real, Plano Gratuito selecionado via API
  real e removido do banco ao final:
  - `Respostas nas comunidades com mídia` presente;
  - `Atendimento prioritário` ausente;
  - `Suporte prioritário via WhatsApp` ausente;
  - `scrollWidth=390` e `innerWidth=390`.
- Cleanup confirmado com `codex_smoke_users=0`.

## Pendências

- Nenhuma pendência funcional desta alteração.
