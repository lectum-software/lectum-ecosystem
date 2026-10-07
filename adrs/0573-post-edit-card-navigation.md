# ADR-0573 - Cards respeitam dialogs nativos

## Status

Aceito.

## Contexto

A top layer do dialog impede interacao com o fundo, mas nao corta a propagacao
de eventos para o card ancestral. O seletor de role explicito nao reconhece o
papel implicito do dialog. Por isso clicar no contenteditable da edicao iniciada
em Minhas Publicacoes pode chamar router.push do card.

## Decisao

Reconhecer o elemento dialog nos tres guards existentes dos cards (post,
resposta propria e resposta salva), cobrindo descendentes e areas vazias.
Manter guards ARIA legados, navegação externa e eventos padrao do editor.
Nao adicionar stopPropagation global a todas as modais, nem mudar semantica ARIA
apenas para satisfazer um seletor CSS incompleto.

## Consequencias

Correcao de frontend sem migration, env, pacote ou mudanca de API. Validar com
dialog real, componentes reais e handlers de navegacao em browser desktop/mobile,
incluindo clique, Enter, espaco, fechar/reabrir e navegacao fora da modal.
