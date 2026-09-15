# ADR-0286: Três resumos na aba Geral do psicólogo Admin

## Status

Accepted

## Task relacionada

Ajuste complementar da TASK-55 por feedback direto de produto.

## Contexto

A aba **Geral** do detalhe administrativo do psicólogo exibia dois blocos principais abaixo das métricas: `Dados da assinatura` e o resumo de registro profissional. O produto solicitou adicionar um bloco de `Situação da conta` e reorganizar essa área em três colunas na ordem: `Situação da conta`, `Situação do registro` e `Dados da assinatura`.

O Builder/Quick Copy ativo não está exposto como ferramenta callable neste ambiente. A referência visual usada foi a captura enviada pelo usuário e a referência local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`.

## Decisão

- Adicionar um card `Situação da conta` na aba **Geral** de `/psicologos/[id]`.
- O card usa o endpoint real já existente `GET /api/admin/private/psychologists/:id/account` via `useAdminPsychologistAccount`, sem criar mock, endpoint novo ou contrato paralelo.
- Reutilizar a mesma regra visual do status de conta definida para o header:
  - `Conta ativa` quando a conta está ativa e o e-mail confirmado;
  - `E-mail pendente` quando a conta está ativa, mas o e-mail não foi confirmado;
  - `Conta suspensa`/`Conta desativada` quando `account_status` bloqueia login;
  - fallback honesto quando o endpoint real falhar.
- Reorganizar a área de resumos da aba **Geral** em grid mobile-first: uma coluna na base mobile e três colunas em desktop (`xl`) na ordem `Situação da conta`, `Situação do registro`, `Dados da assinatura`.
- Renomear visualmente o resumo de CRP para `Situação do registro`, mantendo as ações sensíveis concentradas em `Perfil e cadastro`.
- Não alterar backend, schema Prisma, migrations, packages ou dados persistidos.

## Consequências

- O Admin passa a enxergar, na aba Geral, os três estados operacionais mais relevantes sem navegar entre abas.
- Há uma segunda superfície usando `useAdminPsychologistAccount`; TanStack Query compartilha o cache com header/aba Conta, evitando contrato duplicado.
- Em telas estreitas, os cards permanecem empilhados para preservar a regra mobile-first.
- O card `Dados da assinatura` perde largura em desktop, mas mantém o conteúdo somente leitura e aceita quebra de linha nos valores.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso após uma primeira tentativa bloqueada por outro processo `next build` em andamento.
- Smoke HTTP local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf` retornou `200`.
- `pnpm check` foi executado: frontend e biome backend passaram, mas o backend ficou bloqueado em `prisma generate` por `ENOTEMPTY` ao remover `backend/src/external/generated/prisma/models`, fora do escopo deste ajuste frontend/Admin.

## Pendências

- Validação visual autenticada interativa no navegador do usuário, caso ele queira conferência pixel a pixel após atualizar a página.

## Atualização 2026-07-19

Após feedback visual na tela real, o card `Situação do registro` ficou mais enxuto na aba Geral: remove `Origem`, `Responsável` e `Última atualização`, deixando origem/responsável para superfícies mais detalhadas do registro. O card `Dados da assinatura` mantém o LTV em destaque textual, mas sem fundo azul, e os três cards principais usam altura alinhada no desktop com empilhamento mobile-first.

Validações adicionais:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`

## Atualização 2026-07-19 - plano de cortesia no resumo

O card `Dados da assinatura` da aba Geral passou a reutilizar a mesma regra visual do header para o plano atual: assinatura administrativa ativa (`source="admin_grant"`) aparece como `Plano de cortesia`. A decisão evita sugerir assinatura paga comum quando o direito profissional vem de cortesia operacional.

Validações adicionais:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`

## Atualizacao 2026-07-22 - situacao da assinatura no card Dados da assinatura

O card `Dados da assinatura` da aba Geral passou a seguir a mesma composicao visual dos outros dois blocos de situacao: bloco azul de `Situacao atual`, titulo, badge e texto explicativo antes das linhas de detalhe. A situacao e derivada apenas de dados reais ja carregados pelo detalhe Admin e, quando disponivel, pelo endpoint real de billing.

Regras de apresentacao:

- `source="admin_grant"` ativo ou cortesia ativa no billing vira `Cortesia ativa`.
- Plano profissional pago ativo vira `Assinatura paga ativa`.
- Plano gratuito ativo vira `Plano gratuito ativo`.
- `inadimplente`, `cancelada`, `inativa` e ausencia de assinatura usam labels e textos honestos, sem criar estado simulado.

Nao houve alteracao de backend, schema Prisma, migrations, endpoints, packages ou dados persistidos. A decisao mantem os tres cards principais da aba Geral alinhados em desktop e empilhados em mobile-first.

Validacoes adicionais:

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin build` foi reexecutado, mas ficou bloqueado por lock preexistente em `.next/lock` apos outro processo `next build` nao finalizar limpo.
- `pnpm check` (frontend e backend passaram; admin ficou bloqueado por formatacao preexistente em `admin/src/app/(admin)/pacientes/[id]/client.tsx` e `admin/src/app/(admin)/pacientes/client.tsx`).
- Smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf` retornou `200`.
