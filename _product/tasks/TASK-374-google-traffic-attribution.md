# TASK-374 - Origem de campanhas no GA4

Status: Concluida localmente

## Escopo
Corrigir page_view que substitui a URL sanitizada por uma raiz sem identificadores. Preservar UTMs aprovadas da campanha Meta e click IDs Google, alem da origem publica de buscadores/redes conhecidas, sem caminhos clinicos ou consultas de busca.

## Aceite
- [x] Configuracao e eventos usam o mesmo contexto de entrada sanitizado.
- [x] UTMs da campanha atual e click IDs chegam ao page_view.
- [x] Referrer de buscadores/redes conhecidos preserva somente origem.
- [x] Consentimento, revogacao, deduplicacao e exclusao de dados privados preservados.
- [x] Testes de regressao, check frontend e build aprovados.

ADR-0738. Sem banco, novas envs ou alteracao visual. Rollback: reverter commit e republicar frontend. Publicacao pendente de autorizacao; nao ha correcao retroativa das visitas antigas.

## Evidencias
56 testes de privacidade aprovados, incluindo envio real ao stub do SDK, UTMs, click IDs, consentimento tardio, navegacao durante download e revogacao. Check frontend completo e build frontend aprovados. pnpm check passou pelos guards e frontend; interrompido no backend por DATABASE_URL ausente, sem alteracoes backend alem do bump obrigatorio. Logs .tmp/google-attribution-check.log e .tmp/google-attribution-build.log. Versao 0.1.879. Sem push/deploy; confirmacao em rede real depende de publicacao.
