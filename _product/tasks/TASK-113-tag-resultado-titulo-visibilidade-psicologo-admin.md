# TASK-113 - Tag de resultado no titulo de Visibilidade do psicologo Admin

## Status

Completed

## Contexto

Na aba Estatisticas do detalhe administrativo de um psicologo, o titulo do bloco **Visibilidade** exibia uma tag fixa `Unidade: tempo`. O pedido de produto e mostrar ali o resultado operacional da visibilidade do psicologo, por exemplo `Alta visibilidade`, `Baixa visibilidade`, `Sem visibilidade`, `Visibilidade padrao` ou `Dados insuficientes`.

## Escopo

- Calcular no backend um diagnostico real de Visibilidade para o psicologo no periodo selecionado.
- Reutilizar os limiares e benchmark existentes de exposicao/visibilidade da plataforma.
- Expor o diagnostico no contrato do endpoint administrativo de estatisticas do psicologo.
- Trocar a tag fixa do frontend Admin por uma tag semantica baseada no diagnostico.

## Fora de escopo

- Criar nova migration ou novos campos persistidos.
- Alterar a formula dos graficos/counters de Visibilidade.
- Usar mocks ou valores fixos para classificar o psicologo.

## Criterios de aceite

- [x] A tag ao lado do titulo `Visibilidade` deixa de exibir `Unidade: tempo`.
- [x] A tag exibe o resultado real do periodo: `Alta visibilidade`, `Baixa visibilidade`, `Sem visibilidade`, `Visibilidade padrao` ou `Dados insuficientes`.
- [x] O resultado vem do backend com base em sinais reais de `page_view_event.duration_seconds`, `content_attention_session.attention_seconds` e `profile_video_watch_session.watched_seconds`.
- [x] O contrato Admin tipa o diagnostico de Visibilidade.
- [x] A UI continua mobile-first e reaproveita o badge existente do bloco.
- [x] ADR relevante foi registrado.
- [x] Validacoes de backend/admin foram executadas.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local do endpoint administrativo de estatisticas do psicologo.
- Validacao visual local no Admin para confirmar que a tag renderizada no titulo de Visibilidade usa o diagnostico e nao `Unidade: tempo`.

## Observacoes de execucao

- Builder/Quick Copy nao ficou callable neste ambiente; a validacao visual usou o Admin local e a referencia ativa documentada em `_product/tasks/PROTO-INVENTORY.md`.
- A task nao altera Prisma schema nem migrations.
