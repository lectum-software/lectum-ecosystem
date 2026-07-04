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

## Atualizacao 2026-06-16 - telas de conteudo focado com sidebar recolhida

- Algumas telas secundarias de conteudo focado tinham optado por `showNavigation={false}` para preservar o mobile sem navegacao global, mas isso tambem removia totalmente a sidebar no desktop.
- Para `/app/reviews`, `/app/professional/reviews`, `/app/settings/account` e `/app/posts/mine`, a decisao passa a ser renderizar a navegacao apenas como sidebar desktop recolhida por padrao, usando `showMobileNavigation={false}` e `desktopSidebarDefaultCollapsed`.
- O mobile permanece sem bottom navigation nessas telas, preservando o comportamento anterior abaixo de `lg`.
- A expansao manual e a persistencia por rota continuam valendo; rotas principais como Psicologos, Favoritos, Comunidade/feed, Notificacoes e Perfil nao foram alteradas.

## Atualizacao 2026-07-04 - telas profissionais secundarias com sidebar recolhida

### Contexto

O produto pediu que `Editar perfil`, `Meus Analytics` e `Minha Assinatura` exibam, apenas no desktop, o mesmo menu lateral recolhido ja presente em `Minhas Avaliacoes`. Essas telas continuam sendo secundarias e focadas, portanto o mobile deve permanecer sem bottom navigation.

Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente. A referencia visual usada foi o print enviado pelo usuario de `Minhas Avaliacoes`, com apoio das imagens locais `_product/proto/Editar Perfil - Psicologo.jpg`, `_product/proto/Meus Analytics - Psicologo.jpg`, `_product/proto/Minhas Assinatura - Psicologo.jpg` e `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.

### Decisao

- Estender a decisao de telas de conteudo focado com sidebar recolhida para `/app/professional/profile/setup`, `/app/professional/analytics` e `/app/professional/billing`.
- Reutilizar o `PrivateTemplate` existente com `desktopSidebarDefaultCollapsed` e `showMobileNavigation={false}`.
- Em telas que antes usavam `showHeader={false}` para remover a navegacao, ativar explicitamente `showNavigation` apenas para permitir a sidebar desktop, mantendo a ausencia de bottom navigation no mobile.
- Nao criar outro shell, submenu ou componente de navegacao paralelo.

### Consequencias

- As quatro telas profissionais secundarias (`Minhas Avaliacoes`, `Meus Analytics`, `Editar perfil` e `Minha Assinatura`) passam a compartilhar a mesma navegacao desktop recolhida.
- O mobile continua focado e sem navegacao inferior nessas rotas.
- A preferencia manual de expandir/recolher por rota continua sendo respeitada pelo `PrivateTemplate`.
- Nao houve alteracao de contrato, API, autenticacao, backend, Prisma, migrations, packages ou dados persistidos.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check` executado; frontend passou, mas o backend falhou em `biome check` por formatacao em arquivos de checkout/billing ja modificados fora deste ajuste (`CheckoutRepository.ts`, `ICheckoutRepository.ts`, `services.ts`, `sync-mercado-pago-subscription.ts`).
- Browser local com `next start --port 3114` e Chrome/CDP em desktop 1365x768 confirmou sidebar recolhida (`w-[88px]`) e ausencia de bottom navigation em `/app/professional/profile/setup`, `/app/professional/analytics`, `/app/professional/billing` e `/app/professional/reviews`.
- Browser local com Chrome/CDP em mobile 390x844 confirmou `asideDisplay=none`, `mobileBottomCount=0` e sem overflow horizontal nas tres rotas alteradas.
