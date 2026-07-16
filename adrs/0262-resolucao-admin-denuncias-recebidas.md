# ADR-0262: Resolução administrativa auditada de denúncias recebidas

## Status

Accepted

## Contexto

A aba **Denúncias** do detalhe administrativo do psicólogo existia como leitura de `post_report`, sem fluxo operacional para triagem. A TASK-70 exige resolver denúncias reais contra posts/respostas sem criar nova tabela de moderação, sem hard delete e sem misturar a decisão com sanções de conta.

## Decisão

- Reutilizar `post_report.status` como máquina de estado operacional: `pendente` é o estado não terminal exibido no Admin, `em_analise` permanece apenas como legado agrupado em **Pendente**, `rejeitada` representa improcedência e `resolvida` representa procedência.
- Não expor mais a etapa/opção **Em análise** na aba Denúncias: sem card, filtro, capacidade, modal, ação ou endpoint para mover uma denúncia para análise antes da resolução.
- Na UI da aba Denúncias, filtros devem ser enxutos e consistentes com Dashboard/Estatísticas: sem faixa informativa redundante, sem chip de contagem de filtros, sem linha "Período consultado", ordem Tipo → Status → Período → De → Até e campos de data sempre visíveis com aplicação ao sair do grupo de datas.
- Registrar cada ação em `admin_activity_log` com `area="denuncias"`, `source="admin_panel"`, motivo obrigatório, `safe_before`/`safe_after` seguros e metadados sem conteúdo integral ou dados pessoais do denunciante.
- Remover conteúdo apenas por soft delete real:
  - post: `community_post.deleted=true`, `deletedAt` preenchido, `status="removido"` e respostas associadas removidas por soft delete;
  - resposta: `post_reply.deleted=true` para alvo e descendentes, com ajuste de `community_post.replies_count`.
- Ao remover conteúdo, fechar denúncias não terminais do mesmo `target_type`/`target_id` como `resolvida` para não manter fila pendente de conteúdo indisponível.
- Não aplicar bloqueio, suspensão, restrição de conta nem notificação automática nesta task.

## Consequências

- A resolução passa a ser auditável e rastreável sem migração de schema.
- O feed público continua protegido pelos filtros existentes de `deleted=false` e `status="publicado"`.
- Reabertura de denúncia, sanções de conta e notificações ficam para tasks futuras com ADR próprio.
- Registros legados em `post_report.status="em_analise"` continuam resolvíveis diretamente como pendentes, sem migração de schema.
- A remoção de cópias auxiliares e badges de filtro reduz ruído operacional; a data continua auditável pelo contrato/API, mas não é repetida na UI.
- A validação local não dispara mutações reais sem autorização explícita sobre uma denúncia específica; endpoints protegidos, contratos, builds e checks validam a implementação.

## Atualização 2026-07-16 - Lista premium no detalhe do psicólogo

- A aba **Denúncias** do detalhe administrativo do psicólogo passou a reutilizar o layout compacto da lista premium de denúncias da comunidade.
- O contrato de `GET /api/admin/private/psychologists/:id/reports` foi estendido com `content.body`, `content.media` e `reported_by.name`, usando dados reais de `post_report`, `community_post`, `community_post_media`, `post_reply` e `user`.
- A tag principal do card no detalhe do psicólogo exibe a comunidade do conteúdo denunciado, substituindo a tag de autoria usada na comunidade.
- Mídias de posts/respostas denunciados são exibidas abaixo do texto do conteúdo, preservando o padrão de leitura compacto e sem criar endpoint paralelo, schema novo ou mock.

## Atualização 2026-07-16: revisão auditada de decisão encerrada

Denúncias já encerradas passam a aceitar uma revisão administrativa explícita, em vez de reaproveitar silenciosamente o fluxo inicial de resolução. A UI mostra **Revisar decisão** para estados terminais e exige novo status, motivo interno e confirmação forte `REVISAR DECISAO`.

A revisão reutiliza `post_report.status` e `admin_activity_log`, sem criar tabela de moderação paralela: `pendente` reabre a análise, `rejeitada` mantém improcedência e `resolvida` mantém procedência. O log usa ações `community_report_decision_reviewed` e `psychologist_report_decision_reviewed`, com `safe_before`, `safe_after`, `previous_resolution`, `resolution` e `review=true`.

Conteúdo removido por decisão procedente não é restaurado automaticamente quando a decisão é revista; restauração de conteúdo deve continuar sendo ação explícita futura, para evitar reexposição acidental.

Consequência: o Admin ganha correção operacional reversível e auditável sem schema Prisma, migration, endpoint simulado, mock ou package novo.
