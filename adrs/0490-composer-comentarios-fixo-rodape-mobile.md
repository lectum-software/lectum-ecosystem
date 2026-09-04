# ADR-0490: Composer de comentários fixo no rodapé mobile

## Status

Accepted

## Task relacionada

TASK-174 - Fixar barra de comentários no detalhe do post

## Contexto

O detalhe do post usa o `ReplyComposer` principal como uma barra fixa no mobile para permitir que o
usuário comente enquanto lê a discussão. Depois de interagir com o campo, alguns navegadores
mobile/PWA podem manter `env(keyboard-inset-height)` com a altura anterior do teclado mesmo quando o
teclado não está mais visível. Como o composer aplicava esse env como `bottom` padrão, a barra podia
ficar elevada no meio da tela e cobrir o conteúdo abaixo.

## Decisão

- Manter o composer principal com `position: fixed` e `bottom-0` no mobile como fonte base de
  ancoragem no rodapé.
- Remover `env(keyboard-inset-height)` do `bottom` inline do composer.
- Aplicar `style.bottom` somente quando o composer não é inline, está ativo e o hook baseado em
  `visualViewport` mede um offset positivo de teclado.
- Preservar `pb-36` nas superfícies de detalhe e árvore para que o conteúdo role acima da barra fixa.
- Manter composers inline de respostas no fluxo normal da árvore.

## Alternativas consideradas

### Usar `env(keyboard-inset-height)` sempre

Rejeitada. O valor pode ficar stale após o fechamento do teclado em mobile/PWA, causando exatamente a
barra flutuante reportada.

### Remover qualquer compensação de teclado

Rejeitada. Sem compensação medida, o teclado virtual pode cobrir o campo enquanto o usuário digita.

### Tornar todos os composers fixos

Rejeitada. Respostas inline em threads dependem do fluxo local para manter contexto visual e cancelar
rascunho sem mudar a posição da árvore.

## Consequências

- Sem teclado visível, a barra volta diretamente ao rodapé da viewport mobile.
- Com teclado aberto e `visualViewport` disponível, a barra continua subindo apenas o necessário para
  ficar utilizável.
- A solução não adiciona package, env, endpoint, schema, migration, mock ou persistência.
- Rollback simples reverte o commit; o risco conhecido do rollback é a barra voltar a ficar deslocada
  quando o env do teclado estiver stale.

## Validação

- Teste estático garante o `fixed bottom-0`, a remoção de `env(keyboard-inset-height)` no composer e
  a reserva inferior no detalhe/árvore.
- `frontend check`, `frontend build`, `pnpm check`, browser/local HTTP e smoke de homologação.
