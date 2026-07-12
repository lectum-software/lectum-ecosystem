# ADR-0259: Card de análises do vídeo sem esticamento vazio

## Status

Aceita

## Task relacionada

Ajuste visual avulso do painel Admin, após TASK-57.

## Contexto

Na aba **Estatísticas** do detalhe administrativo do psicólogo, o card
**Análises do vídeo de apresentação** ficava esticado para acompanhar a altura do
card de estatísticas de negócio ao lado. Como o conteúdo real do card de vídeo é
mais compacto, isso criava uma grande área vazia dentro do bloco e prejudicava o
aproveitamento visual da tela.

Referência visual local consultada:
`_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
Builder/Quick Copy não esteve disponível como ferramenta neste ambiente; a
implementação usou a imagem local, o estado atual da tela em browser local e a
solicitação visual do produto.

## Decisão

Remover o esticamento forçado do card de vídeo na grade desktop:

- o card passa a usar `xl:self-start` em vez de `xl:h-full`;
- a grade interna deixa de usar `flex-1`, mantendo altura proporcional ao
  conteúdo real;
- o card de estatísticas de negócio permanece com sua altura natural, e o card
  de vídeo deixa de exibir espaço branco artificial na parte inferior.

## Consequências

- O bloco de vídeo fica mais compacto e não aparenta conteúdo ausente.
- A tela preserva a hierarquia mobile-first e a disposição em duas colunas no
  desktop.
- Não houve alteração de API, banco de dados, pacotes, autenticação ou contratos.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/test-id?tab=estatisticas`
  retornou `200`.

## Pendências

- Nenhuma.
