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

## Complemento 2026-08-03 — presets canônicos da leitura profissional

A barra de períodos do Analytics privado do psicólogo passa a exibir somente:

- `7 dias`;
- `30 dias`;
- `Este ano`;
- `Todo o período`;
- `Personalizado`.

`Todo o período` é o preset selecionado por padrão. O backend agora aceita `period=year` para a janela do ano
corrente e `period=all` para incluir todos os eventos persistidos desde o início da série histórica, sem criar
schema, migration, pacote novo ou dados simulados. Os presets legados de 90 e 365 dias continuam apenas como
compatibilidade técnica de contrato, mas não aparecem mais na UI da tela.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `Invoke-WebRequest` em `/app/professional/analytics` sem sessão autenticada retornando `307` para o fluxo privado.
- Complemento 2026-08-03: `pnpm --dir backend check`, `pnpm --dir backend build`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, verificação estática dos
  novos labels/default e `next start` local em `/app/professional/analytics` com redirecionamento
  `307` sem sessão.
