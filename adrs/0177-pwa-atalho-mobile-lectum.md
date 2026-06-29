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
- respeito a `Agora não` e `Não mostrar novamente`;
- não chamar `Notification.requestPermission`.

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
    `Adicionar atalho`;
  - no iOS/Safari exibe instruções manuais para `Compartilhar` > `Adicionar à Tela de Início`;
  - não aparece quando a Lectum já está em `standalone`/`fullscreen`;
  - usa `localStorage` por navegador/dispositivo para `Agora não`, `Não mostrar novamente` e
    instalação aceita;
  - usa `sessionStorage` com a chave `lectum.activePrompt` para evitar empilhar prompts de
    produto no mesmo momento. A TASK-38 deve reutilizar essa coordenação para notificações.
- Montar o prompt no layout raiz, dentro dos providers, mas com gate de rota/sessão:
  - só considera rotas `/app`;
  - só exibe para usuário confirmado em Redux Persist;
  - só exibe em experiência mobile;
  - não acessa browser APIs durante SSR.

## Consequências

- Usuários mobile podem adicionar a Lectum à tela inicial com experiência próxima de app.
- O prompt não depende de pacote novo.
- A preferência de recusa é local ao navegador/dispositivo; isso é aceitável para o MVP porque não
é uma preferência de conta nem dado crítico.
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
  - `Agora não` e `Não mostrar novamente` persistiram em `localStorage`.

## Pendências

- TASK-38 deve implementar o pedido contextual de permissão de notificações usando consentimento
  separado e sem empilhar com o prompt PWA.
- Validação em dispositivo físico iOS/Android real deve ser repetida antes de produção.
