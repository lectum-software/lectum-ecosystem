# ADR-0521 - Indicador de notificacoes visualizadas na abertura da central

## Status

Aceita em 2026-09-20.

## Contexto

O badge do item `Notificacoes` no shell privado usava notificacoes `read=false`. Assim, abrir a central nao removia o indicador; ele so sumia apos clicar em cada notificacao ou usar `Marcar todas como lidas`. Isso confundia dois estados diferentes: ciencia de que existem novidades e leitura/acao individual sobre cada notificacao.

## Decisao

Separar visualizacao de leitura:

- adicionar `notifications.seen_at` nullable, com migration aditiva e sem backfill obrigatorio;
- manter `read` como estado de leitura/interacao do item individual;
- fazer o filtro leve `search=unread`, usado pelo badge, contar notificacoes ainda nao visualizadas (`seen_at IS NULL`), preservando o nome legado do filtro para compatibilidade de cliente;
- adicionar `POST /api/private/notification/seen`, escopado pelo usuario autenticado, para preencher `seen_at` em massa quando a central carrega;
- ao clicar em uma notificacao ou marcar todas como lidas, tambem preencher `seen_at`, pois leitura implica visualizacao;
- no frontend, chamar `seen` uma vez ao abrir `/app/notificacoes`/`/app/notifications`, invalidando a raiz de notificacoes para remover o badge do shell sem alterar o destaque de nao lida dentro da lista.

## Consequencias

A experiencia passa a seguir o padrao esperado pelo usuario: abrir a central remove o marcador global de novidade, enquanto cada item pode continuar visualmente nao lido ate receber clique ou limpeza explicita. O contrato e aditivo e tolera rollout: frontend antigo continua funcionando com `read`; frontend novo depende do endpoint novo apenas para limpar o badge por visualizacao.

Nao ha env nova, package novo, mock, seed, limpeza de dados ou mudanca de provider. A coluna nullable evita bloqueio por dados existentes e permite rollback mantendo a coluna sem uso.

## Validacao

- `pnpm --dir backend exec prisma validate`
- `pnpm --dir backend exec prisma generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

`pnpm --dir backend db:migrate` foi executado conforme regra da task, mas o Prisma retornou `Schema engine error` antes de aplicar a migration no datasource configurado. Nao foi executado reset nem comando destrutivo.