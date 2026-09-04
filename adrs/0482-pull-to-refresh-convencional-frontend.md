# ADR-0482: Pull-to-refresh convencional no frontend mobile

## Status

Accepted

## Task relacionada

Refinamento de TASK-37

## Contexto

O usuário pediu que a Lectum adotasse o comportamento mais convencional para o gesto de arrastar a
tela para baixo no navegador mobile e no PWA. Em apps e sites móveis, o padrão esperado é atualizar
o conteúdo da tela atual, não limpar caches agressivamente nem reiniciar a aplicação inteira.

O frontend já usa Next.js App Router e TanStack Query como fonte de server state. A implementação
precisa funcionar com o app aberto no navegador e em modo standalone, sem pacote novo, sem backend,
sem migration e sem acoplar o gesto a fluxos críticos de formulário.

Builder/Quick Copy não está exposto como ferramenta callable nesta sessão. A referência visual
auditável usada foi `_product/tasks/PROTO-INVENTORY.md` e os padrões existentes do shell mobile,
modais PWA e componentes com tokens Lectum.

## Decisão

- Criar `PullToRefresh` como componente client-side global do frontend, montado dentro do
  `QueryClientProvider` no layout raiz.
- Habilitar a captura do gesto somente em experiência mobile/coarse pointer.
- Considerar o gesto elegível apenas quando:
  - a página está no topo;
  - a cadeia de scroll do alvo também está no topo;
  - não há modal ou superfície bloqueante aberta;
  - o início do toque não acontece sobre campo de entrada, elemento editável, slider/textbox ou alvo
    marcado explicitamente para ignorar o gesto.
- Permitir que cards, links e botões clicáveis participem do gesto quando houver arrasto vertical,
  porque esse é o comportamento mais próximo do pull-to-refresh convencional em listas e feeds
  mobile; um toque simples continua acionando o controle normalmente.
- Ao soltar após o limite visual, atualizar a tela atual com:
  - `router.refresh()` para recarregar dados de Server Components/Next;
  - `queryClient.invalidateQueries({ refetchType: "active" })` para refazer queries ativas;
  - atualização best-effort do registro de PWA quando houver suporte do navegador.
- Não chamar `window.location.reload()` como caminho padrão, pois isso se aproxima de hard reload e
  pode descartar contexto local sem necessidade.
- Não limpar storage, sessão, cache HTTP, uploads em andamento ou dados locais.
- Desabilitar o gesto em rotas de login/cadastro, configuração/conta, checkout/assinatura,
  WhatsApp, setup/edição e criação/sugestão de conteúdo para evitar perda acidental de progresso.
- Usar `overscroll-behavior-y: contain` apenas na experiência mobile para reduzir conflito com o
  pull-to-refresh nativo do navegador e manter comportamento igual no PWA.

## Consequências

- Usuários de navegador mobile e PWA passam a ter um gesto familiar para atualizar listas, perfis,
  comunidades, notificações e outras telas de leitura.
- O refresh é de dados/rota, não um hard refresh destrutivo.
- Telas com fluxo de formulário ou ação crítica ficam protegidas contra acionamento acidental.
- Não há alteração de contrato, banco, backend, admin, env ou dependência.
- Rollback simples reverte este commit; o navegador volta a depender do comportamento nativo quando
  disponível.

## Validação

- `pnpm --dir frontend exec biome check --write src/app/layout.tsx src/app/globals.css src/components/pull-to-refresh.tsx src/utils/pull-to-refresh.ts src/utils/pull-to-refresh.test.mjs package.json`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/pull-to-refresh.test.mjs`

Validações finais da task devem registrar também `pnpm --dir frontend check`, `pnpm --dir frontend build`,
`pnpm check`, browser local mobile e `pnpm check:version`.
