# TASK-251 - Contexto da arvore e filtros do feed

## Escopo

Corrigir controles de ramos ao abrir resposta por Minhas Publicacoes e manter o
filtro ativo visivel no carrossel do feed principal e da comunidade ao retornar.
Referencia mobile-first: captura do usuario de 12/10/2026, Mais uteis selecionado.
Preservar layout, URL, periodos, rolagem vertical e regras de listagem existentes.

## Aceite

- [x] Caminho de resposta focada abre automaticamente e conserva controles de ramo.
- [x] Ocultar e reabrir prevalece sobre foco automatico; novo foco revela novo caminho.
- [x] Filtro ativo reaparece na area horizontal visivel na montagem e troca de selecao.
- [x] Resize e mudanca de largura dos chips ajustam somente o carrossel.
- [x] Validar check frontend e guards; registrar limitacoes do ambiente local.
- [ ] Concluir QA visual da arvore por Minhas Publicacoes e do retorno aos filtros.

## Decisao e rollout

ADR-0613. Somente frontend, sem API, banco, env ou dependencia nova.
Sem push/deploy. Rollback pela versao anterior do frontend. Fonte visual enviada
pelo usuario, sem redesenho nem necessidade de Builder/Quick Copy.

## Validacao

`pnpm --dir frontend check` aprovado: 760 testes, lint e typecheck. Os 10 testes
focados de disclosure e filtros tambem passaram. Guards de versao, encoding,
ADRs, tarefas, source-safety, env, source-size e ciclos aprovados, assim como
`git diff --check`. Versao sincronizada em 0.1.655.

QA local chegou ao diretorio de comunidades com dados reais. A compilacao da
rota de comunidade falhou com `ENOSPC` no cache do Next; os dois fluxos completos
continuam sem validacao visual. Build de release nao executado por falta de
espaco. Servidor frontend local encerrado; nenhum push ou deploy realizado.
