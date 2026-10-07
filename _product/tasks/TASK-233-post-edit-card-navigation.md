# TASK-233 - Edicao sem navegar pelo card de origem

## Objetivo

Corrigir o relato de 07/10/2026: editar por Minhas Publicacoes abre a modal,
mas clicar no texto navega ao detalhe. Preservar a edicao na pagina do post.
PROTO-INVENTORY consultado; sem mudanca de layout, contrato ou dependencias.
ADR-0573. Validacao local, sem push/deploy neste ajuste.

## Causa e escopo

A modal usa dialog nativo desde TASK-231. O papel ARIA implicito nao satisfaz
o seletor CSS [role='dialog'] dos cards. Eventos continuam borbulhando na arvore
React/DOM mesmo quando o dialog esta na top layer.
Adicionar dialog aos guards existentes de post, resposta propria e salvo.
Nao impedir comportamento padrao do editor, nem alterar a primitive global.

## Aceite

- [x] Clique no titulo, conteudo, espacos da modal e midia nao navega pelo card.
- [x] Enter/espaco editam o texto sem abrir publicacao; Salvar/fechar preservados.
- [x] Fora da modal, clique e teclado continuam abrindo o card.
- [x] Teste de regressao e browser 320/390/1440px aprovados.
- [x] Check frontend e build aprovados.

## Evidencias

Fixture isolada dos componentes reais da edicao, RHF e handlers reais do card:
outputs/edit-post-fixture.tsx e outputs/check-edit-post.cjs. Antes da correcao,
os tres guards retornaram false para titulo, conteudo, header e dialog nativo.
Nenhuma API de escrita, sessao de usuario ou post real foi alterado no teste.

Apos a correcao, os tres guards reconhecem todos os quatro alvos. O browser
valida zero navegacoes durante clique, digitacao, Enter/espaco, remocao de midia,
submit do formulario, Escape e reabertura. Fora da modal, clique, Enter e espaco
continuam navegando. Capturas mobile/desktop revisadas; sem overflow horizontal.
Teste persistente em profile-reply-actions.test.mjs incluido no check frontend.
Check frontend completo e gates estruturais da raiz passaram em 07/10/2026.
Backend/admin/video nao tiveram codigo alterado nem seus checks repetidos.
Build frontend 0.1.605 aprovado (90 paginas). Webpack reportou aviso de cache
sem impedir compilacao. Frontend /version e backend /ping locais responderam 200.

Rollback: reverter somente os tres seletores. Validar o salvamento autenticado
pela tela Minhas Publicacoes no localhost antes de uma nova publicacao autorizada.
