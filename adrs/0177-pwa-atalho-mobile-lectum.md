# ADR-0177: Instalação da Lectum como app/atalho mobile via PWA

## Status

Accepted

## Task relacionada

TASK-37

## Contexto

A Lectum será entregue inicialmente como site responsivo, mas a experiência mobile precisa se
aproximar de um aplicativo instalado. O caminho escolhido para o MVP é tornar o frontend
instalável como PWA/atalho, sem criar app nativo e sem misturar este consentimento com
notificações push.

A TASK-37 exige:

- manifest/metadados PWA;
- ícones reais da marca;
- prompt mobile-first para Android/Chromium e fallback iOS/Safari;
- respeito a `Agora não` com cooldown local;
- não chamar `Notification.requestPermission`.

Refinamento de produto em 2026-06-29 removeu a opção permanente `Não mostrar novamente`, pediu o
mesmo ícone visual usado como favicon da Lectum e exigiu um blur escuro de fundo para o prompt não
se misturar com a tela subjacente.

Refinamento adicional em 2026-06-29 definiu insistência moderada para psicólogos gratuitos ou
assinantes: manter somente `Agora não`, usar 48 horas nas duas primeiras recusas e voltar para 7
dias da terceira recusa em diante.

Refinamento de produto em 2026-07-04 esclareceu que a sugestão deve ser entendida como PWA/atalho,
não como "instalar SPA" nem como migração para SPA pura. A copy anterior "Acesse a Lectum como um
app" gerou ambiguidade com instalação de app/SPA, então a linguagem passou a ser explícita sobre
adicionar a Lectum à tela inicial.

Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente. A referência visual
auditável usada foi o shell privado/mobile existente, com consulta a `_product/tasks/PROTO-INVENTORY.md`.
Não há protótipo específico para o prompt de instalação.

## Decisão

- Configurar PWA com recursos nativos do Next.js:
  - `frontend/src/app/manifest.ts`, gerando `/manifest.webmanifest`;
  - metadados em `frontend/src/app/layout.tsx` para manifest, ícones e Apple Web App.
- Criar ícones PWA dedicados em `frontend/public/pwa/`:
  - `icon-192.png`;
  - `icon-512.png`;
  derivados do ícone real atual da marca (`frontend/public/icon.png`), sem criar marca temporária.
- Criar o componente client-side `PwaInstallPrompt`:
  - usa `beforeinstallprompt` no Android/Chromium e só chama `prompt()` após clique em
    `Adicionar à tela inicial`;
  - no iOS/Safari exibe instruções manuais para `Compartilhar` > `Adicionar à Tela de Início`;
  - não aparece quando a Lectum já está em `standalone`/`fullscreen`;
  - usa `localStorage` por navegador/dispositivo para `Agora não` e instalação aceita;
  - não exibe nem consulta a antiga preferência permanente `lectum.pwaInstall.neverShowAgain`;
  - usa `lectum.pwaInstall.dismissCount` para aplicar cooldown por papel: pacientes e papéis
    desconhecidos ficam em 7 dias; psicólogos ficam em 48 horas nas duas primeiras recusas e 7
    dias da terceira em diante;
  - usa `sessionStorage` com a chave `lectum.activePrompt` para evitar empilhar prompts de
    produto no mesmo momento. A TASK-38 deve reutilizar essa coordenação para notificações.
- Após o refinamento de 2026-06-29, o prompt usa `/icon.png` via `next/image` como ícone visual
  da modal, alinhado ao favicon/ícone real da Lectum, e passa a renderizar um overlay escuro com
  `backdrop-blur-[8px]`, equivalente à linguagem da modal de novo post.
- Após o refinamento de 2026-07-04, a copy principal passa a ser **"Adicionar a Lectum à tela
  inicial"**, com CTA **"Adicionar à tela inicial"** e explicação de que o ícone é apenas um atalho
  do site em modo app, sem ativar notificações ou alterar preferências. A arquitetura permanece
  Next.js App Router; não há migração para SPA pura.
- Montar o prompt no layout raiz, dentro dos providers, mas com gate de rota/sessão:
  - só considera rotas `/app`;
  - só exibe para usuário confirmado em Redux Persist;
  - só exibe em experiência mobile;
  - não acessa browser APIs durante SSR.

## Consequências

- Usuários mobile podem adicionar a Lectum à tela inicial com experiência próxima de app.
- A copy deixa de sugerir "instalação de SPA" e comunica atalho/PWA de forma mais literal.
- O prompt não depende de pacote novo.
- O cooldown de recusa é local ao navegador/dispositivo; isso é aceitável para o MVP porque não é
  uma preferência de conta nem dado crítico.
- Usuários não recebem mais uma saída permanente na própria modal; a escolha de produto prioriza
  reexibição respeitosa por cooldown em vez de bloqueio indefinido local.
- Android/Chromium recebe prompt nativo quando o navegador disponibiliza `beforeinstallprompt`.
- iOS/Safari mantém fallback honesto, pois não há prompt nativo equivalente exposto ao site.
- Instalar atalho continua separado de ativar notificações. Esta task não pede permissão de
notificações e não altera Web Push.

## Validação

- `pnpm --dir frontend exec biome check --write src/app/layout.tsx src/app/manifest.ts src/components/pwa-install-prompt.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check` (primeira tentativa estourou timeout; reexecução com timeout maior passou)
- Browser local via Chrome/CDP em `http://127.0.0.1:3002`:
  - `/manifest.webmanifest` respondeu 200 e foi listado no build;
  - cenário Android/Chromium com `beforeinstallprompt` injetado confirmou prompt, CTA e chamada
    do `prompt()` apenas após clique;
  - cenário iOS/Safari por user agent confirmou instruções manuais;
  - cenário standalone confirmou que o prompt fica oculto;
  - `Agora não` persistiu cooldown em `localStorage`.

Refinamento 2026-06-29:

- `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local via Chrome/CDP em `http://localhost:3000`, viewport mobile `390x844`, com estado
  local de usuário confirmado e URL `/app/favorites` simulada por `history.pushState` para isolar
  o prompt sem criar usuário/token fake persistente:
  - o prompt exibiu overlay escuro com blur;
  - o ícone renderizado foi `/icon.png`, o mesmo ícone real usado como base do favicon/PWA;
  - a opção `Não mostrar novamente` não apareceu;
  - `Agora não` continuou fechando a modal com cooldown local.

Refinamento 2026-06-29 validado no ADR-0183 para backoff por perfil e manutenção de `Agora não`
como única ação secundária.

Refinamento 2026-07-04:

- `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `http://127.0.0.1:3006/app/favorites`, viewport mobile
  `390x844`, em cenário iOS/Safari com estado local temporário de usuário confirmado:
  - o prompt exibiu **"Adicionar a Lectum à tela inicial"**;
  - o CTA exibiu **"Adicionar à tela inicial"**;
  - a explicação exibiu que é apenas um atalho do site em modo app;
  - a copy antiga **"Acesse a Lectum como um app"** não apareceu;
  - o CTA abriu as instruções manuais de iPhone/iPad e exibiu **"Entendi"**.

## Pendências

- TASK-38 deve implementar o pedido contextual de permissão de notificações usando consentimento
  separado e sem empilhar com o prompt PWA.
- Validação em dispositivo físico iOS/Android real deve ser repetida antes de produção.
