# TASK-154: Digests temporais para push de notificacoes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-154 |
| Prioridade | P1 |
| Esforco | M |
| Fase | Notificacoes / Retencao sem ruido |
| Status | Completed |
| Dependencias | TASK-29A, TASK-29B, TASK-38, TASK-63 |
| ADR alvo | ADR-0451 |

## Contexto

Em 2026-08-11, produto decidiu reduzir ruido em push web. Alguns eventos continuam importantes para o historico in-app, mas podem ficar excessivos como push imediato quando ocorrem em volume.

Para pacientes, os eventos de engajamento `upvote`, `salvamento` e `compartilhamento` devem deixar de disparar push imediato e passar a compor um digest temporal quando houver novidades.

Para psicologos, `visualizacao_perfil`, `compartilhamento`, `upvote` e `salvamento` devem entrar no digest diario profissional e nao devem disparar push imediato. `novo_favorito`, `nova_avaliacao`, `clique_whatsapp` e `nova_resposta` continuam elegiveis a push imediato. `novo_post` em comunidade para psicologos deve sair do push imediato e entrar em um digest temporal proprio, com no maximo um push a cada 2-4 horas. A implementacao escolhe 3 horas como intervalo minimo.

## Objetivo

Alterar a politica de push imediato e os schedulers de digest para reduzir excesso de push sem remover as notificacoes in-app individuais nem alterar os eventos de dominio existentes.

## Pre-requisitos e bloqueios

- TASK-29A e TASK-29B concluidas para fundacao e eventos de notificacao.
- TASK-38/TASK-153 concluidas para fluxo de permissao push no navegador.
- TASK-63 concluida para auditoria de entregas/campanhas.
- VAPID e subscriptions reais continuam sendo os mesmos requisitos ja existentes.
- Nenhuma env, migration, endpoint ou package novo.
- Nao usar mock, dados fake, seed destrutivo ou subscription falsa.

## Escopo backend

- Ajustar o dispatcher central de notificacoes para:
  - suprimir push imediato de `upvote`, `salvamento` e `compartilhamento` para pacientes;
  - suprimir push imediato de `visualizacao_perfil`, `compartilhamento`, `upvote`, `salvamento` e `novo_post` para psicologos;
  - manter push imediato elegivel para `novo_favorito`, `nova_avaliacao`, `clique_whatsapp` e `nova_resposta` de psicologos;
  - manter push imediato de `nova_resposta` para pacientes;
  - preservar criacao in-app individual e `notification_delivery` com status `skipped` para push suprimido.
- Ajustar o digest diario profissional para contar somente categorias sem push imediato:
  - `visualizacao_perfil`;
  - `compartilhamento`;
  - `upvote`;
  - `salvamento`.
- Criar digest temporal de engajamento do paciente:
  - categorias: `upvote`, `salvamento`, `compartilhamento`;
  - intervalo minimo: 3 horas por usuario;
  - enviar somente se houver notificacoes novas desde a ultima fronteira de digest/check;
  - usar `/app/notificacoes` como destino.
- Criar digest temporal de novos posts para psicologos:
  - categoria: `novo_post`;
  - intervalo minimo: 3 horas por usuario;
  - enviar somente se houver notificacoes novas desde a ultima fronteira de digest/check;
  - usar `/app/notificacoes` como destino.
- Reutilizar `user_background` com `type=notification_digest_state`, sem alterar schema.

## Escopo frontend/admin

- Nenhuma alteracao visual ou de rota.
- A central de notificacoes e configuracoes continuam exibindo as mesmas categorias.

## Fora do escopo

- Criar novas preferencias de notificacao por canal ou por digest.
- Alterar service worker, VAPID, payload estrutural de push ou subscription.
- Alterar campanhas manuais do Admin.
- Criar tela nova para digests.
- Migrar dados historicos ou reenviar notificacoes antigas.

## Impacto em producao e plano de rollout

- Compatibilidade com dados existentes: sem migration; estado de digest usa JSON existente em `user_background`.
- Banco: sem expandir/backfill/contrair. Nao ha alteracao de schema.
- Envs: nenhuma env nova. Usa `NOTIFICATION_DIGESTS_ENABLED` e intervalo do scheduler ja existentes.
- Contratos: sem endpoint novo e sem campo novo obrigatorio.
- Rollout: backend novo pode conviver com frontend/admin antigos, pois a mudanca e de politica de entrega server-side.
- Jobs/providers: o scheduler de digests ja existente passa a verificar dois digests temporais a cada ciclo. Na primeira execucao por usuario, cria baseline e nao envia push retroativo.
- Rollback: reverter o commit restaura a politica anterior de push imediato e remove a geracao dos novos digests temporais.

## Criterios de aceite

- [x] Paciente nao recebe mais push imediato para `upvote`, `salvamento` e `compartilhamento`.
- [x] Paciente continua recebendo in-app individual para `upvote`, `salvamento`, `compartilhamento` e `nova_resposta`.
- [x] Paciente continua elegivel a push imediato para `nova_resposta`.
- [x] Existe digest temporal de engajamento do paciente com intervalo minimo de 3 horas e envio somente quando houver novidades.
- [x] Psicologo nao recebe mais push imediato para `visualizacao_perfil`, `compartilhamento`, `upvote`, `salvamento` e `novo_post`.
- [x] `visualizacao_perfil`, `compartilhamento`, `upvote` e `salvamento` entram no digest diario profissional.
- [x] `novo_favorito`, `nova_avaliacao`, `clique_whatsapp` e `nova_resposta` de psicologo continuam elegiveis a push imediato.
- [x] Existe digest temporal de `novo_post` para psicologos com intervalo minimo de 3 horas e envio somente quando houver novidades.
- [x] Eventos agrupados continuam criando notificacoes in-app individuais e entregas push suprimidas auditaveis como `skipped`.
- [x] Nao houve migration, env nova, endpoint novo, package novo, mock, subscription fake ou seed destrutivo.
- [x] Testes automatizados cobrem a politica de supressao e as regras puras de digest temporal.
- [x] Backend check executado sem erro.
- [x] `pnpm check` executado sem erro.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Versao dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; deploy de homologacao foi comunicado e smoke validado.

## Validacao minima

- `pnpm --dir backend exec node --import tsx --test src/main/notification/push-policy.test.ts src/main/notification/digests/temporal-support.test.ts`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm check`
- Smoke de homologacao apos push:
  - backend `/ping`;
  - backend `/health`;
  - backend `/ready`;
  - frontend/admin `/version`.

## Notas de execucao

- A primeira execucao temporal por usuario apenas grava baseline para evitar push retroativo com notificacoes antigas.
- O intervalo minimo escolhido foi 3 horas, dentro da faixa de 2-4 horas solicitada para `novo_post` de psicologos e adequado tambem para reduzir ruido de engajamento do paciente.
- Como o historico in-app individual permanece, a central de notificacoes continua sendo a fonte detalhada; o push vira aviso agregado.

## Execucao 2026-08-11

- Branch confirmada: `homolog`.
- Alteracao backend-only, sem UI e sem necessidade de Builder/Quick Copy.
- `backend/src/main/notification/push-policy.ts` centralizou a politica estatica de supressao de push imediato por digest.
- `backend/src/main/notification/index.ts` passou a usar a politica antes de enviar push imediato.
- `backend/src/main/notification/digests/professional.ts` passou a contar somente `visualizacao_perfil`, `compartilhamento`, `upvote` e `salvamento`.
- `backend/src/main/notification/digests/temporal.ts` e `temporal-support.ts` implementaram os digests temporais de paciente e psicologo.
- `backend/src/main/notification/digests/scheduler.ts` passou a processar os digests temporais no ciclo ja existente.
- `backend/src/main/notification/digests/state.ts` passou a reconhecer `patient_engagement_digest` e `psychologist_new_posts_digest`.
- Testes novos:
  - `backend/src/main/notification/push-policy.test.ts`;
  - `backend/src/main/notification/digests/temporal-support.test.ts`.
