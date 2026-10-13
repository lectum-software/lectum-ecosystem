# TASK-250 - Bloqueio de video no retorno do perfil

## Escopo

Manter videos de fundo pausados durante toda a criacao de post, inclusive na rota
completa reaberta depois de editar o nome no perfil. Referencia: captura mobile do
usuario em 12/10/2026, estado Nome atualizado. Layout existente preservado.

## Aceite

- [x] Suspender midia externa a modal em todas as entradas, nao apenas no slot.
- [x] Manter a suspensao no estado Nome atualizado e ao continuar para o formulario.
- [x] Preservar a previa de midia dentro da modal e o ownership de modais aninhadas.
- [x] Validar testes, tipos e entradas locais; registrar limitacoes de QA autenticada.
- [x] Conferir editar nome, retornar e continuar com video real ao fundo.

## Decisao

ADR-0612. Reutilizar o hook existente durante toda a montagem da folha.
Sem backend, banco, variavel de ambiente ou dependencia nova. Sem push/deploy.

## Validacao local - 2026-10-12

- Versao local 0.1.654; bump unico nos cinco manifests conforme politica do repositorio.
- `pnpm --dir frontend check` aprovado: Biome, ESLint, TypeScript e todas as suites frontend.
- 37 testes focados de modal, autoplay e navegacao aprovados. Cobrem pausa de fundo,
  eventos play/playing tardios, promessa de play pendente, preview interno e ownership aninhado.
- Guards de version, secrets, encoding, adrs, tasks, source-safety, env, source-size e cycles aprovados.
- `git diff --check` aprovado.
- Browser local: abrir Criar Post pelo feed ativa `data-lectum-modal-media-suspended=true`;
  fechar remove o atributo; navegar diretamente para `/app/comunidades/feed/publicacao/nova`
  ativa o mesmo bloqueio com a modal visivel. Ambas as rotas responderam HTTP 200.
- Limite de QA: feed local sem publicacoes/videos. Nao foi validado o ciclo completo de editar
  nome e retornar com video real, nem alterado perfil para simular esse cenario. Captura de
  screenshot indisponivel na ferramenta; inspecao feita por arvore de acessibilidade e DOM.
- Tentativas anteriores interrompidas por falta de espaco foram repetidas apos limpeza de
  caches npm/npx/pnpm; o check final passou. Nenhum dado de produto foi excluido.
- Sem alteracao visual ou de rotas; build de release e checks dos demais apps nao repetidos
  neste ajuste de comportamento restrito ao frontend. Validacao final antes de publicar permanece pendente.
- Servidor e aba local de teste encerrados apos QA devido a nova falta transitoria de espaco;
  cerca de 2,1 GiB voltaram a ficar livres. Nenhum servico de producao foi alterado.

## Retomada da validacao - 2026-10-12

- Build de producao do frontend 0.1.655 concluido com sucesso em modo de baixo uso
  de disco, sem alterar o codigo desde a validacao anterior.
- Browser local em 390x844: Criar Post na comunidade, ativar anonimato, abrir Editar
  nome e salvar o perfil com o mesmo nome existente retornou para Nome atualizado.
- `data-lectum-modal-media-suspended=true` confirmado nesse estado e depois de
  Continuar para o post; o atributo foi removido ao fechar a folha.
- Nenhum post foi criado. Nao havia video no feed local desse usuario; o teste de
  reproducao real ao fundo permanece pendente. Screenshot indisponivel na ferramenta;
  evidencias obtidas por acessibilidade e DOM, sem modificar o estado pelo DOM.

## Aprovacao para publicacao - 2026-10-13

- Usuario confirmou no localhost que o video permanece pausado apos editar o nome
  e retornar para Criar Post. Confirmacao recebida antes de preparar a publicacao.
- Nova execucao dos 47 testes focados de modal, autoplay, navegacao, filtros e
  disclosure passou, assim como typecheck frontend sem escrita incremental.
- Guards de segredos, encoding, ADRs, tasks, source-safety, env, tamanho, ciclos,
  versao e git diff --check passaram. Check completo e build final seguem como gates.
- Controle do navegador indisponivel nesta retomada; a validacao final do video
  real foi feita pelo usuario, nao por uma nova captura automatizada.

## Gate final - 2026-10-13

- Versao 0.1.656 sincronizada nos cinco manifests; pnpm check completo aprovado.
- A primeira execucao teve timeout no teste optional-auth-failure do backend;
  passou isoladamente em cerca de cinco segundos e na repeticao completa, sem
  mudar teste, timeout ou codigo. Evidencia: .tmp/release-0656-check-retry.log.
- Build frontend de producao aprovado, incluindo TypeScript e 90 paginas,
  com LECTUM_LOW_DISK_MODE=1. Evidencia: .tmp/release-0656-frontend-build.log.
- Skips existentes: teste de symlink no admin e 13 renders de video sem FFmpeg.
  Nenhum codigo desses servicos mudou. Publicacao segue via PR homolog -> main.
