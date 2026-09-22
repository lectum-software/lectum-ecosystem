# ADR-0524: Normalizacao imediata de catalogos no downgrade para gratuito

## Status

Accepted

## Contexto

O Plano Gratuito do perfil profissional permite 3 especialidades, 1 servico e 1 abordagem. Antes desta decisao, quando um psicologo em Plano Profissional pago ou cortesia administrativa caia para o gratuito, os limites passavam a valer apenas na proxima edicao: os vinculos excedentes continuavam ativos no banco e podiam seguir aparecendo em superficies publicas ate que o usuario salvasse o perfil dentro dos limites.

## Decisao

Sempre que o backend restaurar ou criar uma assinatura gratuita por downgrade, ele tambem normaliza os vinculos de catalogo do perfil:

- preserva ate 3 `psychologist_specialty`;
- preserva ate 1 `psychologist_service`;
- preserva ate 1 `psychologist_approach`;
- aplica `deleted=true`/`deletedAt` aos excedentes, sem exclusao fisica.

A escolha dos itens preservados usa ordem deterministica alinhada a apresentacao publica do catalogo: `position`, depois `name`, com `createdAt` e `id` como desempates tecnicos. A regra e executada nos caminhos de restauracao/criacao do gratuito, incluindo cancelamento Mercado Pago, downgrade por inadimplencia, selecao/criacao de gratuito e revogacao de cortesia sem outro entitlement profissional ativo.

Nao manteremos itens premium ocultos para reativacao automatica em um upgrade futuro. Se o profissional voltar ao Plano Profissional, ele pode selecionar novamente os catalogos desejados de forma consciente, evitando surpresa e divergencia entre perfil publico e plano vigente.

## Consequencias

- O perfil passa a refletir imediatamente os limites comerciais do Plano Gratuito apos downgrade.
- O historico tecnico permanece recuperavel via soft-delete, mas nao e restaurado automaticamente no upgrade.
- Nao ha migration, env nova, package novo nem contrato de API novo.
- Rollback simples reverte o codigo; relacoes ja soft-deletadas durante a versao nao sao reativadas automaticamente.

## Validacao

- Testes focados de `free-subscription` cobrindo soft-delete deterministico e preservacao de entitlement profissional.
- `pnpm --dir backend check` e `pnpm --dir backend build` devem passar antes do push.
