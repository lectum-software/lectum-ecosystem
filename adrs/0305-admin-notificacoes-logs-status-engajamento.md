# ADR-0305: Logs automáticos exibem status e engajamento por entrega

## Status

Accepted

## Task relacionada

TASK-64

## Contexto

Na tabela Admin de Notificações automáticas, cada linha representa uma entrega individual para um usuário e canal. Nesse nível de detalhe, colunas agregadas como **Alcance**, **Abertura** e **Cliques** viram indicadores binários e confundem a leitura operacional.

Além disso, o filtro de status dos logs precisa filtrar o status real de `notification_delivery`, não o status de campanha manual.

## Decisão

A tabela de logs automáticos exibe:

- **Status**: estado real persistido da entrega (`queued`, `sent`, `delivered`, `read`, `clicked`, `failed` ou `skipped`), traduzido em badge PT-BR.
- **Engajamento**: resumo derivado de `clicked_at`, `read_at` e `status`, com data/hora abaixo quando há evento persistido.

O bloco de filtros de **Notificações automáticas** inclui o filtro **Status** com opções reais de entrega, enviando `status` no contrato já existente de logs automáticos.

## Consequências

- A tabela fica coerente com logs linha a linha.
- O filtro de status passa a funcionar para notificações automáticas.
- Métricas agregadas de alcance/abertura/clique permanecem nos cards/resumos.
- Não há alteração de backend, banco, migração ou package.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Chunk client de Notificações validado com **Engajamento** e sem **Alcance/Abertura/Cliques**.

## Pendências

- Tracking real de abertura/clique de e-mail permanece fora do escopo desta decisão.
