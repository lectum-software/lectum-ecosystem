# ADR-0445: Blocos internos de demanda para sugestões de comunidades

## Status

Accepted

## Task relacionada

TASK-149

## Contexto

A Lectum já permite que usuários enviem sugestões de novas comunidades pelo app. Essas sugestões eram persistidas em `community_suggestion`, mas o painel Admin não tinha um ambiente para consolidar demanda. O produto não quer criar comunidades automaticamente: a equipe precisa observar volume por tema e decidir, futuramente, abrir uma comunidade real pelo fluxo administrativo.

## Decisão

Criar `community_suggestion_block` como entidade interna do Admin e adicionar `community_suggestion.block_id` nullable. Sugestões existentes permanecem sem bloco e com status `pendente`. O Admin pode criar blocos, alterar status do bloco, mover sugestões entre blocos/sem bloco e arquivar sugestões, sempre via endpoints privados de Moderação e com auditoria em `admin_activity_log`.

Blocos usam status simples: `monitorando`, `candidata`, `convertida` e `arquivada`. A task não cria comunidade automaticamente nem altera a UI do usuário final.

## Consequências

- O Admin passa a enxergar demanda agregada sem expor novos conceitos ao usuário.
- A abertura de comunidade continua uma decisão humana e separada do fluxo de sugestão.
- A coluna nullable evita backfill obrigatório e mantém compatibilidade com dados reais já publicados.
- O status `convertida` é preparatório: o vínculo com uma comunidade real pode ser preenchido em task futura sem quebrar os blocos atuais.

## Produção e rollout

- Compatibilidade com dados existentes: `block_id` entra nullable; registros antigos continuam legíveis.
- Banco: expansão segura com nova tabela e coluna nullable, sem contração e sem migration destrutiva.
- Envs: nenhuma env nova.
- Contratos: endpoint do app que cria sugestão não muda; endpoints Admin são aditivos. Admin novo depende do backend novo apenas para a nova rota.
- Ordem de deploy: backend e admin por `homolog`; frontend público não muda.
- Rollback: reverter código deixa tabela/coluna sem uso e preserva dados; não remover dados publicados.
- Smoke: backend `/health`, `/ready`, `/ping`; Admin `/version` e `/moderacao/sugestoes-comunidades`.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check:encoding`
- `pnpm --dir backend db:migrate` foi executado, mas falhou por drift preexistente em migrations já aplicadas no banco apontado por `DATABASE_URL`; nenhum reset foi executado.

## Pendências

- Corrigir o drift do banco de desenvolvimento/homologação ou fornecer um banco local descartável para `prisma migrate dev` aplicar a migration sem resetar dados reais.
- Em task futura, definir a conversão formal de bloco `candidata`/`convertida` em comunidade real e eventual notificação aos usuários interessados.
