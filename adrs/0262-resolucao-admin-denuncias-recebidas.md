# ADR-0262: Resolução administrativa auditada de denúncias recebidas

## Status

Accepted

## Contexto

A aba **Denúncias** do detalhe administrativo do psicólogo existia como leitura de `post_report`, sem fluxo operacional para triagem. A TASK-70 exige resolver denúncias reais contra posts/respostas sem criar nova tabela de moderação, sem hard delete e sem misturar a decisão com sanções de conta.

## Decisão

- Reutilizar `post_report.status` como máquina de estado operacional: `pendente` e `em_analise` são não terminais, `rejeitada` representa improcedência e `resolvida` representa procedência.
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
- A validação local não dispara mutações reais sem autorização explícita sobre uma denúncia específica; endpoints protegidos, contratos, builds e checks validam a implementação.
