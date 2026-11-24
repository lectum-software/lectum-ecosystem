# TASK-359 - Transcricao unica dentro do post

Status: Concluida localmente; aguardando publicacao autorizada.

## Escopo

Remover a segunda transcricao visivel no rodape de posts e respostas publicas.
Manter o painel existente dentro da midia, seu controle de abrir/fechar e o
texto no HTML inicial via hidratacao publica. Preservar os VideoObjects.
Referencia visual: capturas enviadas pelo usuario em 2026-11-24.
Sem redesenho; preservar layout mobile-first existente.

## Aceite

- [x] Rodape emite somente JSON-LD, sem segunda transcricao visivel.
- [x] Painel original abre/fecha e mantem texto no HTML inicial.
- [x] Testes, checks e build passam; validacao local de desktop e mobile.

## Publicacao

Somente local; sem push, merge ou deploy. Sem migration ou variavel nova.
Referencia: ADR-0723.

## Evidencias locais

- Testes focados: 15 passaram; 1 teste opcional de browser de reels ignorado.
- Build de producao do frontend passou.
- Guards gerais e check completo do frontend passaram no pnpm check.
  A primeira execucao teve timeout isolado em optional-auth-failure; na segunda,
  a variavel temporaria JWT_SECRET_KEY foi omitida por engano. Com o ambiente
  local corrigido, backend check passou (1570 testes, 60 skips, zero falhas).
  Admin check e video check tambem passaram, executados separadamente.
- Chrome/Playwright, larguras 390 e 1440: controle original abre uma unica
  transcricao visivel, fecha corretamente e nao existe disclosure no rodape.
- JavaScript desabilitado: texto da transcricao presente no HTML inicial.
- Pagina real cmwc8sheh008901l9yc1u58py, dados publicos somente leitura.
  O harness encaminhou respostas GET reais da API para contornar CORS de
  localhost; nenhuma resposta de conteudo simulada e nenhuma escrita remota.
- Capturas e harness em out/seo-post-preview/transcript-* (artefatos locais).
- Os dois paineis internos preexistentes permanecem no DOM fechados; apenas
  o painel acionado pelo menu fica visivel. Esta task remove o terceiro bloco
  independente do rodape, sem refatorar os controles existentes.
