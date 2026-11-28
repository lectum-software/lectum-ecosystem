# TASK-377 - Eventos confirmados no Pixel e API da Meta

Status: Concluida

## Escopo
Duplicar os cinco nomes de evento existentes da CAPI no Pixel: CompleteRegistration (usuario e profissional), Contact (incluindo visitante), forum_post, InitiateCheckout e Subscribe. Usuario autorizou URLs das comunidades e, explicitamente, inicio, lista de psicologos e pagina de pagamento. Nao altera campanhas ou regras de confirmacao de negocio.

## Aceite
- [x] Recibos do servidor usam o mesmo event_id e nome da CAPI.
- [x] Consentimento atual, identidade do navegador e evidencia canonica revalidados.
- [x] Novo aceite local do Pixel, sem herdar autorizacao anterior ou emitir eventos retroativos.
- [x] AutoConfig desligado; sem advanced matching, campos de formulario ou conteudo de posts.
- [x] Cinco eventos cobertos; Subscribe depende da confirmacao financeira existente.
- [x] Rotas limitadas e queries desconhecidas bloqueadas.
- [x] Check completo, builds e validacao local.
- [x] Commit local e registro dos resultados.

ADR-0741. Flags opcionais desativadas: backend META_PIXEL_ENABLED; frontend NEXT_PUBLIC_META_PIXEL_ENABLED. O backend usa META_DATASET_ID existente. Publicar backend antes de frontend; ativar somente apos validacao. Sem migration ou pacote novo. Rollback desligando flags/rebuild frontend. Nao ha push/deploy nesta task.

Limitacoes: o navegador precisa estar aberto numa rota autorizada, com aceite, e receber a confirmacao em ate dez minutos da acao. Pagamentos confirmados depois do fechamento continuam apenas CAPI. Polling de cinco segundos, pausado em aba oculta, busca no maximo 30 eventos recentes. Os recibos nao incluem perfil, IDs de publicacoes, texto ou cookies. Nao adiciona PageView: o escopo e espelhar as conversoes existentes. Testes de transporte usam isolamento local, sem gerar conversoes produtivas.

## Evidencias locais
- Versao 0.1.882; builds frontend e backend aprovados com Node 24.22.3.
- Integracao real PostgreSQL/HTTP de contato visitante aprovada: mesmo event_id, isolamento de token/usuario e revogacao.
- Testes do adaptador cobrem os cinco nomes, parametros permitidos, deduplicacao, corrida de revogacao, rotas e novo consentimento.
- Browser local em 390px e 1440px: aceite/recusa, ausencia de overflow e nenhum SDK Meta em localhost.
- Backend local: /health e /ready aprovados; endpoint desativado retorna eventos vazios e no-store.
- Recebimento e deduplicacao reais no Gerenciador de Eventos dependem da futura publicacao/ativacao autorizada; nao foram simulados como evidencia de producao.
- pnpm check completo aprovado (frontend, backend, admin e video); testes opcionais sem ambiente dedicado permanecem skipped conforme a suite.
- Commit local em homolog; sem push, merge ou deploy.
