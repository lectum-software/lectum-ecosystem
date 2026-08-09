# ADR-0132: Player analitico sem barra de progresso sobreposta

## Status

Accepted

## Task relacionada

TASK-20

## Contexto

A previa do video de apresentacao em `/app/professional/analytics` usa a variante minimal do `VerticalVideoPlayer` para evitar controles nativos avancados e o menu de tres pontinhos. Mesmo assim, a variante ainda exibia uma barra de progresso azul sobre a imagem do video. Como o bloco de Analytics ja possui o grafico de retencao logo abaixo, essa barra sobreposta criava redundancia visual e competia com o objetivo analitico da secao.

## Decisao

Remover a barra de progresso interna da variante `controlsVariant="minimal"` e manter apenas o botao de play/pause sobre o video. A variante nativa permanece inalterada para posts, perfil publico e demais telas.

## Consequencias

- A previa analitica do video fica mais limpa e focada.
- O unico controle visivel sobre a imagem do video e o play/pause.
- O grafico de retencao continua sendo a referencia visual de progresso/analise no contexto de Analytics.
- O bloqueio de controles nativos avancados definido na ADR-0128 permanece preservado.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `Invoke-WebRequest` em `/app/professional/analytics` sem sessao autenticada, validando o redirecionamento privado esperado.

## Pendencias

- Nenhuma pendencia funcional. Validacao visual autenticada depende de sessao local do psicologo no browser.
