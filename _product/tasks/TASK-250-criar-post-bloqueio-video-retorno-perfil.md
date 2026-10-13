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
- [ ] Conferir editar nome, retornar e continuar com video real ao fundo.

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
