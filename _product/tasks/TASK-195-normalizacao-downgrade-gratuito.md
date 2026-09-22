## TASK-195 - Normalizacao de catalogos no downgrade para gratuito

## Contexto

Quando um psicologo em Plano Profissional pago ou cortesia administrativa cai para o Plano Gratuito, os limites gratuitos passam a ser aplicados na proxima edicao do perfil, mas os vinculos excedentes de especialidades, servicos e abordagens permanecem ativos no banco ate que o proprio usuario salve um payload dentro dos limites. Isso cria diferenca entre a regra comercial do gratuito e o perfil ja publicado.

## Objetivo

Normalizar imediatamente os catalogos do perfil profissional sempre que o backend restaurar/criar uma assinatura gratuita apos downgrade.

## Escopo

- Backend de billing/subscription.
- Soft-delete de relacoes excedentes, sem migration e sem exclusao fisica.
- Cobrir cancelamento Mercado Pago, revogacao/fim de cortesia que restaura gratuito, selecao/criacao de gratuito e downgrade por inadimplencia.

## Regras de negocio

- Plano Gratuito mantem no maximo 3 especialidades, 1 servico e 1 abordagem.
- A selecao preservada deve ser deterministica pela ordem publica do catalogo: `position`, depois `name`, depois `createdAt`/`id` como desempate tecnico.
- Itens excedentes devem receber `deleted=true` e `deletedAt`, preservando historico e permitindo nova escolha se houver upgrade posterior.
- Se ainda houver entitlement profissional/cortesia ativo, nao normalizar.

## Compatibilidade e deploy

- Sem schema/migration, env obrigatoria, package novo, mock, seed, reset ou limpeza de bucket.
- Rollout backend-only: frontends antigos continuam compativeis porque o contrato de perfil ja expunha os limites.
- Rollback simples reverte o commit; vinculos ja soft-deletados por downgrades ocorridos durante a versao nao sao reativados automaticamente.

## Criterios de aceite

- [x] Restaurar/criar assinatura gratuita normaliza especialidades para no maximo 3.
- [x] Restaurar/criar assinatura gratuita normaliza servicos para no maximo 1.
- [x] Restaurar/criar assinatura gratuita normaliza abordagens para no maximo 1.
- [x] Downgrade por inadimplencia tambem restaura o gratuito e aplica a normalizacao.
- [x] Cortesia revogada sem outro entitlement profissional ativo restaura gratuito e aplica a normalizacao.
- [x] Testes automatizados cobrem preservacao de entitlement profissional e soft-delete deterministico dos excedentes.
- [x] ADR registra a decisao de nao manter itens premium ocultos para reativacao automatica.
