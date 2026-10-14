# TASK-257 - Recolhimento unico por arvore

| Campo | Valor |
| --- | --- |
| Status | In Progress |

## Escopo

Solicitado e aprovado em 13/10/2026. Referencia: WhatsApp Image 2026-10-13 at
21.08.26.jpeg fornecida pelo usuario. Inventario visual e arquitetura consultados;
Builder indisponivel. Mobile-first (~390px), mantendo o layout e os controles.

Substituir os repetidos Ocultar respostas por uma unica acao ao final de cada
arvore. A resposta principal permanece visivel; as outras arvores nao mudam.
Na continuacao, o comentario raiz daquela pagina e a referencia do recolhimento.
Preservar Ver respostas, Ver mais e links para continuacoes nos ramos fechados.
Ao recolher, restaurar foco e rolagem na raiz abaixo do cabecalho. Reabrir de forma
progressiva, sem o mesmo link de foco forcar os descendentes a abrir novamente.

## Aceite

- [x] Uma unica acao Ocultar respostas por arvore expandida, somente na raiz.
- [x] Recolhimento disponivel mesmo com Ver mais respostas ainda pendente.
- [x] Resposta principal permanece e arvores independentes nao sao afetadas.
- [x] Ver X respostas continua usando total de descendentes informado pela API.
- [x] Ramos internos mantem abertura progressiva e continuacao, sem recolhimentos repetidos.
- [x] Reabertura respeita o recolhimento manual mesmo com focusReplyId na URL.
- [x] Novo foco profundo continua podendo abrir seu caminho.
- [x] Retorno de foco apos atualizar o DOM, com compensacao de cabecalho e sem rolagem animada.
- [x] Testes focados dos componentes reais e do estado da arvore aprovados.
- [x] Check e build completos frontend.
- [ ] Conferencia visual autenticada mobile/desktop.

## Validacao e rollout

Estado de abertura permanece local a cada ReplyCard. Nao alterar dados, contagens
da API, permissoes, WhatsApp, menu, upload ou profundidade responsiva. Sem migration,
env ou dependencia nova. ADR-0619. Rollback somente frontend.
Testes usam fixtures apenas no harness, sem dados falsos no produto.
Sem push/deploy automatico. Preservar a correcao local de moldura da TASK-256.

Validacao em 13/10/2026, versao local 0.1.664:
- 51 testes focados aprovados, incluindo arvore profunda, ramos fechados,
  continuacao, total de descendentes, botoes de pagina/recolher e retorno de foco.
- pnpm --dir frontend check e build aprovados; logs .tmp/release-0664-frontend-check.log
  e .tmp/release-0664-frontend-build.log.
- Guards de versao, source-size, source-safety, encoding, ciclos, tasks, ADRs e diff aprovados.
- Localhost /version 0.1.664 e /auth/login HTTP 200. Backend local nao alterado.
- Controle automatico do navegador falhou no helper sandbox/Node; nao afirmar QA
  autenticado em celular ou desktop. Task permanece In Progress por essa conferencia.
- Commit local, sem push/deploy; producao permanece na 0.1.662.
