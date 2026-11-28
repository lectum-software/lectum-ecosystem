# TASK-379 - Simplificar aviso de cookies

Status: Concluida localmente

## Escopo
Pedido do usuario: manter o texto do aviso inicial simples. Referencia visual: captura enviada na conversa; nenhum redesenho ou dependencia do Builder. Texto: "Usamos cookies para medir audiência e campanhas. Você pode escolher o que permitir em Preferências."

Os detalhes sobre Google, Meta e URLs continuam em Preferencias. Nenhuma alteracao de consentimento, eventos ou integracoes. Sem decisao arquitetural nova, migration, env ou acao manual. Risco limitado a copy; rollback por reversao do texto.

## Aceite
- [x] Aviso inicial curto, com acesso a Preferencias.
- [x] Detalhes e comportamento de consentimento preservados.
- [x] Checks, build e visualizacao local mobile/desktop.

## Validacao
Versao 0.1.884. pnpm check e build do frontend aprovados. Browser local em 390/1440: aviso curto, acesso real pelo botao Preferencias, aceite e recusa, sem overflow. Backend local do feed indisponivel, sem mocks; verificacao restrita a UI de privacidade. Sem push/deploy nesta task.
