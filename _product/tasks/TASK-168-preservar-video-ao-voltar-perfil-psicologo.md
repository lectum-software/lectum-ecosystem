# TASK-168: Preservar vídeo ao voltar do perfil do psicólogo

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-168 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Correção de experiência mobile-first |
| Status | Completed |
| Dependências | TASK-13, TASK-15, TASK-145, TASK-161, TASK-162 |
| ADR alvo | ADR-0484 |

## Contexto

Na página pública de psicólogos, o usuário navega por um feed vertical de vídeos. Ao abrir o perfil
de um psicólogo a partir desse feed e voltar para `/psicologos`, a tela estava remontando o feed no
primeiro vídeo. Isso quebra a expectativa do fluxo imersivo: voltar deve recolocar o usuário no
mesmo vídeo/posição em que ele estava antes de entrar no perfil, inclusive quando o retorno acontece
pelo botão de voltar do perfil e quando a URL original tinha filtros ou busca.

Esta correção usa apenas estado efêmero da sessão do navegador. Não há alteração de backend, banco,
contrato de API, pacote, provider, env, seed, reset ou dados publicados. O tempo exato do vídeo não é
persistido nesta task; a decisão é preservar a posição do feed e o slide ativo.

Builder/Quick Copy não está exposto como ferramenta callable nesta sessão. Foram consultados o
inventário `_product/tasks/PROTO-INVENTORY.md` e as imagens locais `_product/proto/Psicólogos.jpg` e
`_product/proto/Perfil Profissional - Sobre.jpg` como fallback visual auditável.

## Objetivo

Quando um usuário abrir um perfil a partir do feed de vídeos de psicólogos e retornar, restaurar o
mesmo slide ativo e a posição de scroll do feed, sem reiniciar a lista no primeiro psicólogo.

## Escopo

- Memorizar, em `sessionStorage`, a origem segura do feed, o índice ativo, o ciclo renderizado, o
  psicólogo alvo e o `scrollTop` imediatamente antes de navegar para o perfil público.
- Usar a URL memorizada como fallback do botão voltar do perfil quando não houver histórico de
  navegação aplicável.
- Ao remontar `/psicologos`, `/psychologists`, `/app/psicologos` ou `/app/psychologists`, restaurar
  somente se a URL atual for exatamente a origem memorizada, preservando filtros/query/hash.
- Reconciliar o índice pelo `psychologistId` quando a lista renderizada tiver mudado ou quando o
  índice salvo não existir mais no DOM atual.
- Expirar e limpar o snapshot efêmero para evitar retorno tardio a uma posição antiga.

## Critérios de aceite

- [x] A navegação do feed para o perfil grava a posição atual antes do `router.push`.
- [x] O botão voltar do perfil usa a origem memorizada como fallback seguro quando necessário.
- [x] O retorno ao feed restaura o mesmo slide ativo e alinha o scroll sem reiniciar a lista.
- [x] Filtros, busca, hash e aliases PT/EN são respeitados; snapshots de outra URL não são aplicados.
- [x] Mudança de ordem/lista tenta restaurar pelo `psychologistId` antes de descartar o snapshot.
- [x] Snapshot antigo expira e é removido.
- [x] Não há package novo, env obrigatória, schema, migration, endpoint, mock, seed, reset ou limpeza
  de dados/buckets publicados.
- [x] Testes automatizados cobrem preservação, fallback por ID, expiração e URL divergente.
- [x] ADR registra a decisão de memória efêmera no cliente.
- [x] Validações frontend, build, browser local, versão e push em `homolog` são registradas.

## Validação

- `pnpm --dir frontend exec biome check --write ...`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/persisted-origin-navigation.test.mjs src/app/app/psychologists/modules/feed-loop.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- browser local mobile em `/psicologos`: avançar no feed, abrir perfil e voltar preservando o vídeo;
- `pnpm version:bump`
- `pnpm check:version`
- deploy de homologação após `git push` e smoke em `/version` e `/psicologos`.

## Registro de execução — 2026-09-04

- Branch `homolog` confirmada antes das alterações.
- A investigação localizou o reset no estado inicial de `usePsychologistsSetup` e a navegação para
  perfil em `usePsychologistsNavigation`/sugestões de filtro sem snapshot de retorno.
- Foi criado `psychologists-feed-return-memory` com normalização de URL interna segura e storage
  efêmero em `sessionStorage`.
- A restauração acontece no hook de navegação do feed após a lista real carregar, usando duplo
  `requestAnimationFrame` para alinhar o DOM renderizado antes do `scrollTo`.
- O perfil público passou a preferir a URL original do feed como fallback de retorno.
- Testes focados, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` passaram.
- `pnpm version:bump` sincronizou os cinco manifests em `0.1.268` e `pnpm check:version` aprovou.
- Browser local mobile em build de produção foi validado contra dados reais da API de homologação
  com CORS desabilitado apenas no Chrome headless local, pois o domínio de homologação não permite
  `localhost`: 42 slides renderizados, abertura do perfil de `KLEY DE MORAES` a partir do slide 2,
  snapshot salvo com `activeIndex=2`/`scrollTop=1688` e retorno para `/psicologos` com candidato
  ativo 2 e snapshot consumido.
- A task é frontend-only e compatível com versões independentes das aplicações durante rollout.
