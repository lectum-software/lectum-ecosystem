# TASK-153: Permissao nativa direta de notificacoes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-153 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Experiencia app-like / Notificacoes |
| Status | Completed |
| Dependencias | TASK-12, TASK-29A, TASK-38 |
| ADR alvo | ADR-0450 |

## Contexto

A TASK-38 implementou a modal contextual da Lectum antes do prompt nativo do navegador para permissoes de push. O feedback de produto em 2026-08-11 e que a sequencia modal Lectum + modal do navegador cria friccao e sensacao de duplicidade.

A decisao atual e manter a solicitacao de notificacao aparecendo no mesmo momento em que a modal da Lectum apareceria, mas sem renderizar a modal propria. Nesse momento, a Lectum deve chamar diretamente o prompt nativo via `Notification.requestPermission()`.

Referencias de produto e visual:

- `_product/tasks/TASK-38-permissao-contextual-notificacoes-navegador.md`;
- imagens locais de notificacoes em `_product/proto`;
- `frontend/src/hooks/notification/index.tsx`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, nao houve ferramenta Builder/Quick Copy exposta; o inventario e as imagens locais foram usados como referencia auditavel.

## Objetivo

Remover a modal propria de permissao de notificacoes do `NotificationManager` e disparar diretamente o prompt nativo do navegador no mesmo timing e sob os mesmos gates atuais em que a modal Lectum seria exibida.

## Pre-requisitos e bloqueios

- TASK-12, TASK-29A e TASK-38 concluidas.
- VAPID continua obrigatorio para solicitar push real.
- Nenhum requisito externo novo.
- Nenhuma env, endpoint, migration ou package novo.
- Nao usar mock, subscription fake ou VAPID fake.

## Escopo frontend

- Refatorar `frontend/src/hooks/notification/index.tsx` para:
  - remover a renderizacao da modal `NotificationPermissionPrompt` no fluxo automatico;
  - manter os gates atuais: rota privada, cadastro concluido, browser com suporte, VAPID disponivel, `Notification.permission === "default"`, fora de configuracoes de notificacoes e fora de cooldown;
  - preservar o delay `SHOW_DELAY_MS` como momento de disparo;
  - reservar `lectum.activePrompt` antes de chamar o prompt nativo, evitando sobreposicao com o prompt de PWA;
  - chamar `requestPermissionAndSubscribe()` diretamente no timer;
  - aplicar cooldown/backoff quando a permissao nao for concedida ou a operacao falhar;
  - limpar cooldown quando a permissao for concedida e a subscription for persistida;
  - continuar revalidando subscription automaticamente quando a permissao ja estiver `granted`.
- Manter CTAs manuais existentes em `/app/configuracoes/notificacoes` funcionando por clique explicito.
- Nao alterar texto, payload, digest, eventos de dominio ou preferencias de notificacao.

## Escopo backend

- Nenhuma alteracao backend.
- Nenhuma migration.
- Nenhum endpoint novo.

## Fora do escopo

- Notificacoes nativas iOS/Android fora do PWA/browser.
- Alterar service worker.
- Alterar VAPID ou credenciais.
- Alterar politica de dominio das notificacoes.
- Alterar a modal ou acao de instalacao PWA.

## Impacto em producao e plano de rollout

- Compatibilidade com dados existentes: frontend-only, sem alteracao de schema ou dados.
- Banco: sem migration, backfill ou contracao.
- Envs: nenhuma env nova.
- Contratos: nenhum contrato novo; frontend novo segue compativel com backend/admin ja publicados.
- Jobs/providers: nenhum efeito externo alem do mesmo fluxo de push ja existente.
- Ordem de deploy: publicar frontend em homologacao via push em `homolog`; backend/admin nao precisam de alteracao funcional.
- Rollback: reverter o commit restaura a modal contextual anterior.
- Smoke de homologacao: validar `/version` do frontend/admin, `/ping` do backend e confirmar checks de deploy; o fluxo de permissao nativa depende de browser/dispositivo e foi revalidado em local/CDP antes da promocao.

## Criterios de aceite

- [x] O `NotificationManager` nao renderiza mais a modal propria **Ative notificacoes da Lectum** no fluxo automatico.
- [x] No mesmo timing em que a modal propria seria exibida, o fluxo automatico chama diretamente `Notification.requestPermission()` por meio de `requestPermissionAndSubscribe()`.
- [x] Os mesmos gates atuais continuam validos: rota privada, usuario confirmado e com cadastro concluido, browser com suporte, VAPID disponivel, permissao `default`, fora de cooldown e fora de `/app/configuracoes/notificacoes`.
- [x] O prompt nativo continua coordenado por `lectum.activePrompt`, sem empilhar com PWA.
- [x] Quando o usuario concede permissao, a subscription real continua sendo criada/revalidada e persistida no endpoint existente.
- [x] Quando o usuario nega, fecha ou falha, o cooldown/backoff local e aplicado como antes.
- [x] Estados `granted` e `denied` continuam sem chamada automatica indevida de `requestPermission`.
- [x] `/app/configuracoes/notificacoes` mantem acao manual por clique/toque.
- [x] Nenhum backend, endpoint, migration, service worker, payload push, evento de dominio, env ou package novo foi adicionado.
- [x] Nenhum mock, VAPID fake, subscription fake ou endpoint simulado foi usado.
- [x] Builder/Quick Copy foi usado quando disponivel, ou a limitacao foi registrada com referencia as imagens locais.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erro.
- [x] Browser local validado em viewport mobile, cobrindo ausencia da modal Lectum e chamada direta do prompt nativo.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Versao dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; o deploy de homologacao foi comunicado e nao houve push direto em `main`.

## Validacao minima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/CDP mobile perto de 390px validando:
  - a modal Lectum nao aparece;
  - `Notification.requestPermission()` e chamado no delay automatico quando elegivel;
  - `granted` persiste subscription;
  - `default`, `denied` ou falha aplicam cooldown ou nao repetem indevidamente;
  - `/app/configuracoes/notificacoes` mantem CTA manual.

## Notas de execucao

- Essa task altera uma decisao anterior da TASK-38: deixa de haver consentimento contextual em modal propria no fluxo automatico por decisao explicita de produto.
- A experiencia continua usando a permissao do navegador como fonte de verdade.
- A UI de configuracoes pode continuar explicando status e oferecer acao manual; a remocao se aplica ao prompt automatico que aparecia durante navegacao privada.

## Execucao 2026-08-11

- Branch confirmada: `homolog`.
- Dependencias verificadas como concluidas: TASK-12, TASK-29A e TASK-38.
- Builder/Quick Copy nao ficou exposto como ferramenta direta neste ambiente; a limitacao foi registrada e a referencia auditavel usada foi o inventario visual ativo com imagens locais de notificacoes em `_product/proto`.
- `frontend/src/hooks/notification/index.tsx` foi refatorado para remover a modal automatica **Ative notificacoes da Lectum** e chamar diretamente `requestPermissionAndSubscribe()` apos o delay/gates existentes.
- O fluxo preserva `lectum.activePrompt=notification-permission`, cooldown/backoff local, revalidacao automatica quando `Notification.permission === "granted"` e CTAs manuais em `/app/configuracoes/notificacoes`.
- Nao houve backend funcional, endpoint, migration, service worker, payload push, evento de dominio, env ou package novo.
- Banco/producao: sem alteracao de schema e sem reset/seed/bucket; validacao browser usou sessao temporaria de usuario de teste/smoke e removeu os tokens temporarios criados para o teste.
- ADR criado: `adrs/0450-permissao-nativa-direta-notificacoes.md`.
- Versao incrementada uma vez de `0.1.33` para `0.1.34` e validada com `pnpm check:version`.

## Validacao executada

- `pnpm --dir frontend exec biome check --write src/hooks/notification/index.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK.
- `pnpm check` - primeira tentativa excedeu o timeout local; reexecutado com timeout maior e concluiu OK.
- `pnpm check:tasks` e `pnpm check:adrs` - OK apos atualizacao dos documentos.
- `pnpm check:version` - OK apos version bump.
- Pre-push executou novamente `admin check`, `backend check` e `frontend check` em 0.1.34; o primeiro push foi bloqueado apenas por codificacao deste arquivo, corrigida antes do amend.
- Browser local/CDP mobile `390x844`, com backend local na porta `3011` e frontend local na porta `3000`, cobrindo:
  - fluxo automatico elegivel sem renderizar `role="dialog"` da modal Lectum;
  - chamada direta a `Notification.requestPermission()` via `requestPermissionAndSubscribe()`;
  - `lectum.activePrompt` reservado na chamada e liberado depois;
  - retorno `denied` aplicando cooldown/backoff local;
  - estado inicial `denied` sem chamada automatica indevida;
  - estado inicial `granted` sem chamar `requestPermission()` e com persistencia/revalidacao de subscription via endpoint existente (`204`);
  - `/app/configuracoes/notificacoes` sem chamada automatica e com CTA manual chamando a permissao nativa por clique.