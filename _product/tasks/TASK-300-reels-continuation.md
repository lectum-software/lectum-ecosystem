# TASK-300 - Continuidade e controles dos reels

## Escopo

Mobile-first, com capturas do usuario de 31/10/2026 e controles da pagina de
psicologos como referencia. PROTO-INVENTORY consultado; Builder indisponivel.
Nao altera planos, permissoes de envio, backend ou configuracao produtiva.

- Ampliar icones e espacamento sem sobrepor identidade, legenda ou teclado.
- Progresso visual por animation frame e avancar ao terminar o video ativo.
- Ao voltar do perfil/discussao, restaurar video e tempo pelo historico da aba.
- Corrigir contraste da camera gratuita, preservando a modal de upgrade.
- Esgotar posts da origem e continuar por outras comunidades disponiveis,
  pulando vazios e duplicatas; publicacoes de um perfil continuam restritas.

## Aceite

- [x] Fila atravessa comunidades, paginas, vazios e remocoes sem repetir videos.
- [x] Falhas podem ser retomadas sem perder os videos anteriores.
- [x] Avanco automatico respeita edicao, modal, busca de tempo e slide inativo.
- [x] Progresso suave e retorno ao mesmo video/tempo validados no Chrome.
- [x] Icones maiores e camera gratuita conferidos em mobile/desktop.
- [x] Check/build e documentacao locais; commit sujeito aos hooks, sem push/deploy.

Validacao: frontend check e build completos; 32 cenarios de fila e 23 de layout,
mais testes de progresso/historico e camera. Chrome com API controlada nos testes;
nao substitui smoke de navegacao com dados reais no preparo da publicacao.

Complemento local na TASK-301: Chrome com API/PostgreSQL e MP4 reais, sem endpoints
simulados. Perfil -> voltar restaurou o reel e o tempo; termino natural avancou
apos esgotar a comunidade original. Camera da conta gratuita visivel, branco em
fundo escuro. Registros temporarios de teste removidos ao final. Evidencias em
.tmp/task301-reels-results.json e .tmp/task301-reels-*-390.png.

## Decisao

ADR-0663. Descoberta usa o catalogo e posts existentes, sem novo endpoint.
Somente o endpoint de videos decide quais midias podem entrar na fila.
O catalogo e paginado sob demanda; sem videos restantes, termina sem repetir
o acervo indefinidamente. A ordenacao entre comunidades segue o catalogo atual.

Notificacoes de convite em lotes de 24h permanecem um trabalho separado deste
ajuste de reels. Nenhum disparo ou alteracao de configuracao neste lote.
