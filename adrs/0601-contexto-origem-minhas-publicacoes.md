# ADR-0601: Contexto de origem em Minhas publicacoes

## Retorno para a origem em 12/10/2026

Posts e conversas publicas tambem sao abertos por Minhas Publicacoes. O parametro
`forceBackToFeed` nao pode descartar o historico interno apenas porque nao existe
uma memoria do feed comunitario. Os dois detalhes compartilham uma funcao de
retorno que prioriza a origem registrada e delega ao guard existente de navegacao,
preservando a barreira de autenticacao. Entrada direta sem origem continua indo ao
feed. Regressao cobre post, resposta, feed antigo e entrada direta (23 testes de
navegacao aprovados). Nenhuma nova persistencia ou mudanca no historico global.

Status: em implementacao. Data: 2026-10-11. Task: TASK-28.

Preservar o card azul, remover rotulos de origem e apresentar autoria mascarada pelo mapper existente, comunidade e data. Midia de origem usa somente miniatura compacta a direita, sem player/play; toda a area abre o post ou resposta de origem, nao a propria resposta. Midia da contribuicao permanece intacta. Pacientes e psicologos compartilham a regra. Conteudo removido nao expoe texto, autor ou midia.

Contrato opcional parent_preview somente em mine, usando o select existente de autoria e campo deleted. Frontend tolera backend anterior sem inventar identidade. Sem migration, env, pacote, provider ou escrita de dados. Apps independentes; backend primeiro recomendado, rollback por reversao.

Mobile-first 390px; capturas do usuario e proto como referencia. Builder indisponivel. Testes/check/build e visual local pendentes. Sem push/deploy.

Evidencia parcial: check frontend completo aprovado; 23/23 testes dos controles aprovados. Backend Prisma/TypeScript/Biome e build aprovados; suite 895/896, teste optional-auth-failure excedeu tempo sob concorrencia e passou isoladamente sem alteracao. Consulta READ ONLY em banco isolado validou cinco respostas reais; nenhuma tem resposta-pai, portanto caso de miniatura de video/anonimato herdado ainda depende de conferencia local com conteudo existente pertinente.

Browser automatizado indisponivel por falha de sandbox do kernel. Guard source-size detectou reply-card.tsx preexistente com 708 linhas (fora deste complemento); nao ignorado. Ciclos aprovados. Sem commit/push/deploy deste complemento; build frontend e visual pendentes.

Validacao tecnica final: frontend check completo, build e 23 testes aprovados; backend build e typecheck/Biome aprovados, teste de autenticacao reexecutado isolado aprovado. API local recarregada com /health e /ready HTTP 200. Removida divisoria dos cards de respostas/comentarios mantendo espacamento. Build frontend: .tmp/oct11-origin-frontend-build.log. Sem nova env ou migration. Visual autenticado e caso real de resposta a video ainda pendentes; nao concluir/commitar este complemento antes da conferencia.

## Revisao solicitada pelo usuario em 11/10

Substitui a proposta anterior de preview: remover totalmente o bloco azul/detalhes/miniatura e usar somente link transparente Ver publicacao original com seta. Abaixo, identidade do autor da propria contribuicao, chevron/comunidade e data usando AuthorIdentityLine e AuthorAvatar existentes. Remover linha Respondido em; manter menu de edicao junto a identidade. Preservar anonimato, midia propria e controles. Link aponta ao post ou a resposta-pai conforme origem.

Mudancas nao commitadas de backend/DTO e parent_preview foram removidas por nao serem necessarias. Escopo final somente frontend, sem contrato novo. Esta decisao substitui os criterios anteriores de card azul e miniatura; validacao visual da revisao ainda pendente.

Revisao final link/identidade: check frontend completo, build e 23/23 testes aprovados (.tmp/oct11-origin-link-check.log, oct11-origin-link-build.log, oct11-origin-link-tests.log). Browser voltou a conectar, mas sessao integrada sem autenticacao; login solicitado ao usuario. API local saudavel. Frontend reiniciado apos build. Nenhum commit/push/deploy deste complemento ate conferencia visual.

Revisao visual 11/10: usuario pediu restaurar a divisoria acima dos controles e corrigir menu de tres pontos, cujas opcoes eram atravessadas pelos controles. Cabecalho/menu usa camada 30 acima da barra 20; preservar area de clique, fechamento e modais existentes. Esta decisao substitui a remocao da divisoria apenas nestes cards. Check/build/browser da revisao pendentes.

Revisao menu/divisoria: check completo frontend, build e 24 testes de controles aprovados. Logs .tmp/oct11-mine-menu-check.log, oct11-mine-menu-build.log e oct11-mine-menu-tests.log. Browser integrado acessivel mas sem login; verificacao autenticada depende do usuario no Chrome ou login integrado. Sem novo commit, bump, push ou deploy enquanto a conferencia visual permanece pendente.

Refino 11/10: MyPostsHeader reutiliza AppPageHeader, como Salvos (h-14, 56px), mantendo titulo e retorno ao perfil. Sem novo componente ou contrato; teste compara SSR diretamente com o componente usado em Salvos. Validacao da revisao pendente.

Padronizacao completa solicitada: reutilizar sem modificar AppPageHeader (altura, padding, bordas, raio, sombra, tipografia, seta e alinhamento) e igualar largura responsiva do container de Minhas publicacoes a Salvos, inclusive sm:max-w-2xl. Nenhum arquivo de Salvos ou do componente compartilhado alterado. Teste legado de seta atualizado para verificar delegacao ao componente comum, alem da igualdade SSR.

Padronizacao completa do header: mesmo AppPageHeader de Salvos, incluindo altura 56px, tipografia, seta, cores, bordas, raio, sombra e espacamento interno; container responsivo de Minhas publicacoes alinhado a Salvos. Nenhuma alteracao em Salvos nem no componente compartilhado. Check completo frontend e build final aprovados (.tmp/oct11-mine-header-check.log e .tmp/oct11-mine-header-standard-build.log); 25 testes focais aprovados, incluindo igualdade SSR do header. Teste legado atualizado para validar o uso do componente compartilhado. Conferencia visual autenticada ainda pendente; sem commit/push/deploy deste complemento.

Aprovado pelo usuario em 11/10/2026 apos padronizacao integral do header. Decisao aceita e complemento concluido localmente; validacao tecnica final aprovada e conferencia visual confirmada pelo usuario. Sem push/deploy.
