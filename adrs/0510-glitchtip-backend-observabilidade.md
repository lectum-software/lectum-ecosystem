# ADR-0510 — GlitchTip canônico para observabilidade backend

## Status

Accepted

## Task relacionada

TASK-189

## Contexto

Frontend e Admin já enviam eventos sanitizados ao GlitchTip próprio da Lectum. O backend usa
`@sentry/node` e possui uma política de saneamento, mas sua allowlist aceitava apenas Sentry SaaS;
assim, um DSN válido do GlitchTip configurado no Dokploy era ignorado e a observabilidade backend
não iniciava.

## Decisão

Aceitar somente DSNs HTTPS com projeto numérico e chave pública compatível cujo host seja
`glit.lectum.com.br` ou um host Sentry SaaS já aprovado. Preservar a rejeição de portas, query,
fragmento, senha no user-info, host semelhante e caminhos com prefixo. A captura permanece
error-only e sanitizada. Uma operação manual com confirmação de ambiente será a única forma de
gerar um evento de verificação de transporte.

## Consequências

- O backend pode usar o projeto GlitchTip exclusivo por ambiente já provisionado.
- Não há destino configurável livre nem coleta de request/PII por essa integração.
- Uma execução de verificação cria um evento operacional sanitizado no projeto do ambiente; não é
  chamada por boot e não substitui monitoramento real.
- Qualquer novo host de observabilidade requer revisão explícita desta allowlist e ADR.

## Produção e rollout

- Sem alteração de banco, migration, storage, fila ou contrato público.
- Envs existentes afetadas: `SENTRY_DSN` e `SENTRY_ENVIRONMENT`; ambas continuam opcionais. Não há
  **ALERTA DE DEPLOY** de nova env. Provisionar o DSN do projeto backend correto antes do deploy de
  cada ambiente, sem reutilizar DSN de frontend/admin.
- Publicar e validar primeiro em `homolog`; depois de merge revisado, repetir no runtime de produção
  usando confirmação explícita. Rollback é remover o DSN ou reverter o commit.
- Frontend/Admin/Video não dependem desse comportamento e convivem com versões distintas.

## Validação

- Testes de parsing, saneamento, boot e operação manual; check/build backend e check raiz.
- Smoke de homolog e confirmação do evento sanitizado no GlitchTip após deploy.

## Pendências

- Nenhuma promoção para `main` é autorizada por esta ADR; ela requer smoke de homolog e fluxo de
  revisão normal.
