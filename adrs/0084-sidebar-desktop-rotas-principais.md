# ADR-0084 - Sidebar desktop orientada por rotas principais

## Status

Accepted

## Contexto

O `PrivateTemplate` exibe a sidebar desktop compartilhada pelas rotas `/app`. A regra anterior mantinha a sidebar expandida por padrao na maioria das telas e usava o mesmo calculo de item ativo do mobile, incluindo subrotas por prefixo como `/app/psychologist/*`, `/app/community/*`, `/app/settings/notifications` e `/app/profile/*`.

O produto pediu que, no desktop, a sidebar seja navegacao principal apenas nas cinco areas centrais da experiencia:

- `/app/psychologists`;
- `/app/favorites`;
- `/app/community/feed`;
- `/app/notifications`;
- `/app/profile`.

Nas demais telas, a sidebar deve iniciar recolhida e nao deve indicar item ativo, evitando faixa azul indevida em telas secundarias ou internas.

## Decisao

Centralizar no `PrivateTemplate` uma lista explicita de rotas principais desktop. Essa lista passa a controlar dois comportamentos apenas no desktop:

1. estado inicial do menu lateral;
2. estado visual ativo dos itens da sidebar.

A regra implementada e:

- rotas principais iniciam expandidas por default;
- rotas fora da lista iniciam recolhidas por default;
- a selecao azul da sidebar aparece somente quando o `pathname` e exatamente uma das rotas principais e corresponde ao `href` do item;
- o calculo antigo `isActivePath`, com prefixos, continua sendo usado pela navegacao mobile para nao alterar o comportamento abaixo de `lg`.

A preferencia manual do usuario deixou de usar uma chave global unica e passou a ser persistida por rota, com chave `lectum.desktopSidebar:{pathname}`. Assim, uma escolha manual em uma tela secundaria nao força outras rotas a abrirem fora do default de produto.

## Consequencias

- A sidebar desktop fica expandida por default apenas em Psicologos, Favoritos, Comunidade/feed, Notificacoes e Perfil.
- Telas secundarias como perfil publico de psicologo, edicao de perfil, settings, posts, sugestoes, detalhes e fluxos profissionais iniciam recolhidas por default.
- Nessas telas secundarias, nenhum item da sidebar recebe `aria-current` nem faixa azul de ativo.
- O usuario ainda pode expandir/recolher manualmente a sidebar, com persistencia por rota.
- O mobile permanece inalterado, incluindo os criterios atuais de item ativo da bottom navigation.
- Nenhum contrato de API, dado, backend, Prisma, migration ou package foi alterado.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em rotas principais e secundarias representativas de `/app`

## Task relacionada

Ajuste complementar de UX desktop do shell privado, relacionado a TASK-12.
