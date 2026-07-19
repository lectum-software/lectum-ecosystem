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

## Atualiza��o 2026-07-19

Ap�s feedback visual na tela real, o card `Situa��o do registro` ficou mais enxuto na aba Geral: remove `Origem`, `Respons�vel` e `�ltima atualiza��o`, deixando origem/respons�vel para superf�cies mais detalhadas do registro. O card `Dados da assinatura` mant�m o LTV em destaque textual, mas sem fundo azul, e os tr�s cards principais usam altura alinhada no desktop com empilhamento mobile-first.

Valida��es adicionais:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
