# ADR-0451: Digests temporais para push de notificacoes

## Status

Accepted

## Task relacionada

TASK-154

## Contexto

O sistema de notificacoes da Lectum ja criava itens in-app individuais e enviava push imediato para
diversos eventos de comunidade e perfil. Em 2026-08-11, produto decidiu que alguns eventos de alto
volume podem incomodar como push imediato, mas ainda devem existir na central de notificacoes para
historico e contexto.

As categorias afetadas sao:

- pacientes: `upvote`, `salvamento` e `compartilhamento`;
- psicologos: `visualizacao_perfil`, `compartilhamento`, `upvote`, `salvamento` e `novo_post`.

`novo_favorito`, `nova_avaliacao`, `clique_whatsapp` e `nova_resposta` para psicologos continuam
elegiveis a push imediato. Para pacientes, `nova_resposta` tambem continua imediata.

## Decisao

- Manter a notificacao in-app individual para os eventos existentes.
- Suprimir o push imediato de:
  - `upvote`, `salvamento` e `compartilhamento` para pacientes;
  - `visualizacao_perfil`, `compartilhamento`, `upvote`, `salvamento` e `novo_post` para
    psicologos.
- Registrar a tentativa suprimida como `notification_delivery` de push com status `skipped` e motivo
  `push_suppressed_by_policy`.
- Reorientar o digest diario profissional para conter somente categorias sem push imediato:
  `visualizacao_perfil`, `compartilhamento`, `upvote` e `salvamento`.
- Criar dois digests temporais usando o scheduler de digests existente:
  - `patient_engagement_digest`, para `upvote`, `salvamento` e `compartilhamento`;
  - `psychologist_new_posts_digest`, para `novo_post` de psicologos.
- Usar intervalo minimo de 3 horas por usuario nos digests temporais, dentro da faixa de 2-4 horas
  solicitada para novos posts de psicologos.
- Persistir o estado em `user_background` com `type=notification_digest_state`, adicionando chaves
  novas ao JSON existente, sem migration.
- Na primeira execucao temporal de cada usuario, gravar apenas baseline e nao enviar push retroativo.

## Consequencias

- O push passa a priorizar eventos de maior urgencia ou maior intencao.
- Eventos de volume continuam visiveis na central de notificacoes, mas deixam de interromper o
  usuario a cada ocorrencia.
- Psicologos deixam de receber push imediato de cada novo post de comunidade; recebem no maximo um
  digest temporal a cada 3 horas quando houver novidades.
- O digest diario profissional deixa de misturar categorias que ja recebem push imediato.
- A primeira janela apos deploy pode nao resumir notificacoes criadas antes do baseline, por escolha
  explicita para evitar disparos retroativos em ambiente publicado.

## Producao e rollout

- Compatibilidade com dados existentes: sem schema novo. As novas chaves de digest sao opcionais no
  JSON existente de `user_background`.
- Banco/migrations: nenhuma alteracao.
- Envs: nenhuma env nova e nenhum **ALERTA DE DEPLOY**.
- Contratos: sem endpoint novo, sem payload novo obrigatorio e sem mudanca para frontend/admin.
- Jobs/providers: o scheduler ja existente de digests passa a consultar digests temporais a cada
  ciclo. O provedor web push e as subscriptions continuam os mesmos.
- Rollback: reverter o commit restaura a politica anterior de push imediato e para de processar as
  novas chaves de digest; estados JSON extras ficam inertes.

## Validacao

- Testes unitarios puros para politica de supressao de push imediato.
- Testes unitarios puros para baseline, intervalo minimo e copy dos digests temporais.
- TypeScript do backend.
- `pnpm --dir backend check`.
- `pnpm check`.
- Smoke de homologacao apos push: backend `/ping`, `/health`, `/ready` e frontend/admin `/version`.

## Pendencias

- Monitorar em homologacao os logs de `notification_delivery` com `push_suppressed_by_policy` e a
  taxa de envio dos novos digests para ajustar o intervalo em task futura, se necessario.
