# TASK-204 - Favoritos com retorno discreto ao Perfil

Dependencia: TASK-203 (Completed). Status: Completed.

## Escopo

Favoritos passa a tela secundaria do Perfil no mobile: sem barra inferior,
com somente uma seta circular discreta no canto superior esquerdo. Preservar
exatamente o titulo, descricao, filtros e lista atuais. Referencia: seta do
perfil na imagem enviada pelo usuario em 01/10/2026. Mobile-first 390px.

PROTO-INVENTORY e arquitetura consultados. Reutilizar ArrowLeft de lucide e
Link do Next, com formato circular do hero existente e contraste apropriado
ao fundo claro/escuro de Favoritos. Sem redesenho ou dependencia de Builder.

## Criterios de aceite

- [x] Seta somente com icone, label acessivel e tooltip, apontando a /app/perfil.
- [x] Titulo e demais elementos do cabecalho preservados, sem titulo duplicado.
- [x] Sem barra inferior e sem seu espaco reservado em Favoritos.
- [x] Sidebar desktop e navegacao de outras telas preservadas.
- [x] Visitante/sessao indisponivel tem retorno ao Perfil pelo estado restrito.
- [x] Check/build, regressao e inspecao local aprovados.

## Validacao e deploy

ADR-0548. Conferir em homolog com conta real: titulo inalterado, seta, ausencia
da barra, filtros e retorno ao Perfil inclusive no acesso direto. Nenhum
favorito adicionado/removido para teste. Evidencias em outputs/favoritos-0539.md.

Somente frontend. Sem API, env, migration ou dependencia nova. Rollback por
reversao revisada. Publicar em homolog; producao nao autorizada neste pedido.

Frontend check e build aprovados em 0.1.539. Guards de versao, segredos,
encoding, ADRs, tasks, source-safety, source-size, env e ciclos aprovados.
Smoke local 390x844: Favoritos sem navbar no estado restrito, retorno direto
ao Perfil e navbar preservada no Perfil. Layout autenticado sera conferido
apos deploy de homologacao com sessao real; resultados no relatorio externo.
