# ADR-0305: Logs automáticos exibem status e engajamento por entrega

## Status

Accepted

## Task relacionada

TASK-64

## Contexto

Na tabela Admin de Notificações automáticas, cada linha representa uma entrega individual de notificação para um usuário e canal. Nesse nível de granularidade, colunas agregadas como **Alcance**, **Abertura** e **Cliques** viram indicadores binários (`1` ou `—`) e confundem a leitura operacional.

As métricas agregadas de alcance, abertura e clique continuam fazendo sentido nos cards/resumos, mas não como colunas principais de uma linha de log individual.

## Decisão

A tabela de logs automáticos passa a exibir:

- **Status**: estado real persistido da entrega (`queued`, `sent`, `delivered`, `read`, `clicked`, `failed` ou `skipped`), traduzido para PT-BR em badge.
- **Engajamento**: resumo derivado somente dos eventos persistidos (`clicked_at`, `read_at` e `status`), exibindo **Clicada**, **Lida** ou **Sem engajamento**. Quando houver `clicked_at` ou `read_at`, a data e hora do engajamento aparecem abaixo do badge.

Para entregas por e-mail sem tracking de abertura/clique, a UI informa a limitação em vez de sugerir uma métrica inexistente.

## Consequências

- A tabela fica mais coerente com o fato de cada registro representar uma entrega individual.
- A leitura operacional melhora: status indica envio/entrega/falha, engajamento indica interação real.
- Métricas agregadas de alcance, abertura e clique permanecem nos cards/resumos, onde fazem sentido estatístico.
- Não há alteração de contrato HTTP, backend, banco, migração ou dados persistidos.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.

## Pendências

- Tracking real de abertura/clique de e-mail permanece fora do escopo desta decisão.
