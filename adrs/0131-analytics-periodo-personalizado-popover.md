# ADR 0131 — Filtro de período personalizado em popover no Analytics

## Status

Accepted — 2026-06-19

## Contexto

A tela **Meus Analytics** já possui filtros rápidos de período e uma opção `Período` para intervalo personalizado. O comportamento anterior renderizava os campos `Início` e `Fim` como uma nova seção fixa abaixo da barra de filtros, empurrando os cards de métricas para baixo e ocupando espaço permanente na tela.

## Decisão

Substituímos a seção fixa por um popover contextual ancorado à barra de períodos:

- o botão `Período` abre um balão logo abaixo do controle;
- o popover contém `Início`, `Fim` e o CTA `Aplicar período`;
- clicar fora fecha o popover;
- o botão `Período` permanece visualmente ativo enquanto o popover está aberto;
- o popover é absoluto e não altera a altura da página, evitando deslocamento dos cards;
- no mobile ocupa quase toda a largura útil; no desktop mantém largura compacta.

## Consequências

- A experiência fica mais contextual e premium.
- Os cards de métricas não sofrem deslocamento vertical ao abrir o filtro.
- Não foi necessário instalar pacote de popover nem criar componente de design system paralelo.
- O filtro continua usando o contrato real já existente de analytics; não há mudança em API, schema ou dados.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `Invoke-WebRequest` em `/app/professional/analytics` sem sessão autenticada retornando `307` para o fluxo privado.
