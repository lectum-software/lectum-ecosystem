# ADR-0182: Denuncias de posts prontas para triagem administrativa futura

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

O detalhe do post ja possuia fluxo real de denuncia por usuario autenticado, persistindo `post_report` sem remocao automatica do conteudo. O pedido atual foi preparar esse dado para um painel administrativo futuro, sem construir ainda a audiencia admin, a autenticacao admin ou uma UI de moderacao.

A modelagem anterior identificava a denuncia por `post_id`, `reply_id` opcional e `reporter_id`, mas a unicidade era garantida por busca/atualizacao no repositorio. Isso era suficiente para a tela atual, mas menos robusto para uma fila futura de triagem porque posts e comentarios/respostas compartilham a mesma tabela e podem ser consumidos pelo painel como alvos de moderacao diferentes.

Durante a execucao, o banco de desenvolvimento compartilhado tinha a migration `20260629041000_add_psychologist_role_onboarding_tips` aplicada a partir de outra branch local. A pasta dessa migration foi recuperada para alinhar o historico local ao banco sem executar reset nem apagar dados.

## Decisao

- Manter `post_report` como a tabela unica de entrada para denuncias de posts e replies.
- Adicionar `target_type` (`post` ou `reply`) e `target_id` como alvo normalizado da denuncia.
- Preservar `post_id` e `reply_id` para joins atuais, auditoria de contexto e compatibilidade com endpoints existentes.
- Criar chave unica `@@unique([target_type, target_id, reporter_id])` para impedir duplicidade por usuario/alvo e permitir `upsert` transacional.
- Atualizar o repositorio de posts para usar `upsert` pela chave normalizada; reenvio da mesma denuncia atualiza `reason`, `description`, `status="pendente"`, `post_id` e `reply_id`.
- Retornar `target_type` e `target_id` no DTO de resposta como campos aditivos, sem quebrar os consumidores atuais.
- Nao criar painel administrativo, rotas `manager/admin`, autenticacao admin nem remocao automatica de conteudo nesta etapa.

## Consequencias

- O painel administrativo futuro podera listar uma fila de denuncias usando alvo normalizado sem precisar inferir se a linha representa post ou reply.
- A mesma conta nao cria multiplas denuncias ativas para o mesmo alvo, inclusive em condicoes de concorrencia.
- Denuncias continuam reativas: receber denuncia nao altera `community_post.status`, `post_reply.deleted` ou qualquer regra de visibilidade automaticamente.
- A migracao inclui backfill de `target_type`/`target_id` para denuncias ja existentes.
- A existencia de `target_type`/`target_id` nao substitui a necessidade futura de uma audiencia admin separada, com autenticacao e autorizacao proprias conforme `DATA-MODEL.md`.

## Validacao

- `pnpm --dir backend db:migrate` (primeira execucao aplicou a migration e excedeu timeout da ferramenta; a segunda retornou "Already in sync")
- `pnpm --dir backend exec prisma migrate status`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`

## Pendencias

- Construir, em task futura, a audiencia administrativa separada e o painel de triagem/moderacao.
- Definir em task futura as acoes administrativas de moderacao (`em_analise`, `resolvida`, `rejeitada`, ocultar/remover conteudo, notas internas e auditoria de admin).
