# TASK-37: Instalação da Lectum como app/atalho no celular

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-37 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Experiência app-like / Mobile |
| Status | Completed |
| Dependências | TASK-01, TASK-12 |
| ADR alvo | ADR-0177 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `frontend/src/app` e `frontend/src/templates`, para encontrar o ponto correto de metadados globais e shell privado antes de criar estrutura nova.

## Contexto

Por enquanto a Lectum será entregue somente como site responsivo, mas a experiência mobile deve se aproximar de um aplicativo instalado. A forma correta para o MVP é tornar o frontend instalável como PWA/atalho na tela inicial, com sugestão contextual para o usuário adicionar a Lectum ao celular.

A comunicação deve usar o gênero definido para o produto: **"a Lectum"**. A copy principal recomendada, após refinamento de 2026-07-04, é: **"Adicionar a Lectum à tela inicial"**. A UI não deve usar termos como "instalar SPA" nem sugerir migração para SPA pura; o frontend permanece Next.js App Router com experiência PWA/atalho.

Esta task não substitui app nativo e não deve misturar instalação do atalho com consentimento de notificações. Push notification, Web Push e permissão do navegador continuam separados das tasks de notificações.

## Objetivo

Permitir que o usuário mobile adicione a Lectum à tela inicial e acesse a plataforma em modo standalone/app-like, com orientação clara e respeitosa para Android/Chromium e iOS/Safari.

## Pré-requisitos e bloqueios

- Consultar `ARCHITECTURE.md` antes de criar qualquer componente/template novo.
- Consultar `PACKAGES.md`; a expectativa é **não instalar pacote novo** para esta task.
- Consultar `PROTO-INVENTORY.md`; se não houver tela específica para prompt de instalação, reutilizar a linguagem visual mobile existente do shell privado e registrar essa decisão no ADR.
- Se os ícones finais da marca não estiverem disponíveis em tamanho adequado para manifest/PWA, parar e registrar pendência em vez de criar marca temporária ou mock permanente.
- Se Builder/Quick Copy estiver acessível no cliente, usar como apoio visual; se não estiver, registrar limitação e usar referências locais de `_product/proto`.

## Escopo frontend

- Configurar a instalação PWA da Lectum no Next.js:
  - manifest com `name`, `short_name`, `start_url`, `scope`, `display: "standalone"`, `theme_color`, `background_color` e ícones adequados;
  - metadados compatíveis com iOS, incluindo ícone Apple Touch e status bar quando aplicável;
  - detecção de modo standalone para não exibir sugestão quando a Lectum já estiver instalada/aberta como app.
- Criar sugestão mobile-first de instalação/atalho:
  - copy: **"Adicionar a Lectum à tela inicial"**;
  - explicar que o atalho ficará visível na tela inicial do celular, por privacidade;
  - CTA principal `Adicionar à tela inicial`;
  - ação secundária `Agora não` com cooldown local;
  - não exibir a opção permanente `Não mostrar novamente`;
  - persistir localmente apenas cooldown/instalação no navegador, sem backend.
- Android/Chromium:
  - usar o evento `beforeinstallprompt` quando disponível;
  - chamar o prompt nativo somente após interação explícita do usuário.
- iOS/Safari:
  - exibir instruções manuais para `Compartilhar` > `Adicionar à Tela de Início` quando não houver prompt nativo.
- Integrar a sugestão no shell privado/mobile sem bloquear navegação e sem layout shift relevante.

## Escopo backend

- Nenhuma alteração backend prevista.
- Nenhuma migration prevista.
- Nenhum endpoint novo.

## Fora do escopo

- App nativo iOS/Android.
- Push notification, Web Push, Service Worker de notificações ou pedido de permissão de notificações.
- Offline-first, cache avançado de rotas privadas ou sincronização em background.
- Métricas de analytics persistidas em backend para instalação do atalho.
- Instalar bibliotecas PWA sem justificativa forte e ADR.
- Criar logo/ícone temporário, fake ou diferente da marca real da Lectum.

## Contrato técnico detalhado

Frontend esperado:

- Usar recursos nativos do Next.js para manifest/metadados sempre que compatível com a versão vigente do projeto.
- Procurar primeiro por layout/metadados globais existentes em `frontend/src/app` antes de criar arquivos novos.
- Procurar o shell/template privado existente em `frontend/src/templates` antes de criar um novo ponto de montagem para o prompt.
- O componente de sugestão deve ser client-side apenas onde depender de browser APIs (`beforeinstallprompt`, `matchMedia`, `navigator`, `localStorage`).
- Não acessar `localStorage` durante SSR.
- Não usar `<img>`; qualquer imagem exibida em UI deve usar `Image` de `next/image`. Ícones de manifest podem ser arquivos estáticos referenciados pelo manifest/metadados.
- Usar tokens de tema (`bg-background`, `bg-surface`, `text-foreground`, `border-border`, `text-primary`, etc.), sem cores hardcoded.
- Mobile-first obrigatório: base visual ~390px, com progressão para telas maiores.
- Separar instalação de atalho de notificações: não chamar `Notification.requestPermission` nesta task.

Packages usados:

- Nenhum pacote novo esperado.
- Se a execução provar necessidade de pacote, validar `PACKAGES.md`, registrar ADR antes da instalação e justificar por que APIs nativas/Next.js não bastam.

Persistência local:

- Pode usar `localStorage` para lembrar cooldown/recusa local do navegador.
- A ausência dessa preferência em outro dispositivo/navegador é aceitável nesta task e deve ser explicada no ADR.

## Critérios de aceite

- [x] Manifest/metadados PWA configurados para a Lectum com `display: standalone`, `start_url`, `scope`, cores e ícones reais da marca.
- [x] iOS recebe metadados/ícone compatíveis e instruções manuais quando o prompt nativo não existir.
- [x] Android/Chromium usa `beforeinstallprompt` e só dispara o prompt após toque em `Adicionar à tela inicial`.
- [x] A sugestão mobile-first aparece apenas quando a Lectum não está em standalone, respeita `Agora não` com cooldown e não exibe `Não mostrar novamente`.
- [x] A copy usa **"Adicionar a Lectum à tela inicial"**, mantém o gênero **a Lectum** e evita ambiguidade com SPA pura ou app nativo.
- [x] A UI informa que o atalho ficará visível na tela inicial do celular, por privacidade.
- [x] A task não solicita permissão de notificações nem implementa Web Push/offline-first.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum pacote novo foi instalado, salvo se `PACKAGES.md` e ADR justificarem explicitamente.
- [x] UI mobile-first; nenhum `<img>` cru em UI, somente `next/image` quando imagem for renderizada.
- [x] Builder/Quick Copy foi usado quando disponível, ou a limitação foi registrada e as referências locais/proto foram citadas.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erro.
- [x] Browser local validado em viewport mobile, incluindo estado não instalado, standalone e fluxo iOS/manual ou equivalente documentado.
- [x] ADR criado ou atualizado em `adrs/` registrando decisão PWA/atalho e separação de notificações.
- [x] Commit criado com mensagem convencional e publicado com `git push` (push tentado; registrar bloqueio se credenciais/timeout impedirem publicação).

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local com viewport mobile (~390px)
- Verificação manual/documentada de:
  - estado normal no navegador;
  - estado standalone/app-like;
  - comportamento Android/Chromium com `beforeinstallprompt`, quando disponível;
  - fallback iOS/Safari com instruções manuais.

## Notas de execução

- A sugestão deve ser discreta e contextual; não bloquear primeiro acesso nem impedir tarefas críticas do usuário.
- Preferir exibir em área privada/autenticada, após o usuário já demonstrar intenção de uso da plataforma, para evitar fricção no cadastro/login.
- Se a execução escolher regra de cooldown (por exemplo, dias entre exibições ou número mínimo de acessos), registrar no ADR.
- A task deve preservar a separação conceitual: instalar atalho é conveniência de acesso; notificações exigem consentimento próprio e não entram neste escopo.
## Execução 2026-06-29

- Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente; a referência visual auditável foi `_product/tasks/PROTO-INVENTORY.md` e o shell privado/mobile existente. Não há protótipo específico para o prompt de instalação.
- Implementado `frontend/src/app/manifest.ts`, metadados PWA/iOS em `frontend/src/app/layout.tsx` e ícones reais em `frontend/public/pwa/icon-192.png` e `frontend/public/pwa/icon-512.png`.
- Implementado `PwaInstallPrompt` em `frontend/src/components/pwa-install-prompt.tsx`, com gate para rotas `/app`, usuário confirmado, experiência mobile e ausência de standalone.
- Android/Chromium: `beforeinstallprompt` é retido e o prompt nativo só é chamado após o CTA `Adicionar à tela inicial`.
- iOS/Safari: o CTA abre instruções manuais para `Compartilhar` > `Adicionar à Tela de Início`.
- Preferências locais: `Agora não` usa cooldown por papel em `localStorage` por navegador/dispositivo; instalação aceita limpa esse estado local; o refinamento de 2026-06-29 removeu a opção `Não mostrar novamente`.
- Separação preservada: a task não chama `Notification.requestPermission`, não altera service worker de notificações e não implementa Web Push/offline-first.

## Validação executada

- `pnpm --dir frontend exec biome check --write src/app/layout.tsx src/app/manifest.ts src/components/pwa-install-prompt.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check` (primeira tentativa estourou timeout; reexecução com timeout maior passou)
- Browser local via Chrome/CDP em `http://127.0.0.1:3002`, viewport mobile `390x844`:
  - `/manifest.webmanifest` respondeu 200;
  - Android/Chromium com `beforeinstallprompt` injetado confirmou CTA e chamada de `prompt()` após toque;
  - iOS/Safari por user agent confirmou instruções manuais;
  - standalone ocultou o prompt;
  - `Agora não` persistiu cooldown no navegador.

## Refinamento 2026-06-29

- Pedido de produto: na modal de criar atalho, usar o mesmo ícone da marca exibido como favicon, remover a opção `Não mostrar novamente` e aplicar blur escuro de fundo como na modal de novo post.
- Implementação ajustada em `frontend/src/components/pwa-install-prompt.tsx`:
  - o ícone visual da modal passa a renderizar `/icon.png` com `next/image`, alinhado ao favicon/ícone real da Lectum;
  - a ação permanente `Não mostrar novamente` foi removida da UI e da lógica de bloqueio por `localStorage`;
  - o prompt virou um diálogo com overlay `fixed inset-0`, fundo escuro e `backdrop-blur-[8px]`, mantendo layout mobile-first na base ~390px.
- Validação local do refinamento: Chrome/CDP em viewport `390x844`, com estado local de usuário confirmado e URL `/app/favorites` simulada por `history.pushState` para isolar o prompt sem criar usuário/token fake persistente; confirmou overlay escuro com blur, ícone `/icon.png`, ausência de `Não mostrar novamente` e presença de `Agora não`.
- ADR criado: `adrs/0177-pwa-atalho-mobile-lectum.md`.

## Refinamento 2026-06-29 - insistência por perfil

- Pedido de produto: para psicólogos, gratuitos ou assinantes, a insistência para instalar o atalho pode ser maior até a instalação; manter somente `Agora não`.
- Implementação ajustada em `frontend/src/components/pwa-install-prompt.tsx` e `frontend/src/utils/prompt-cooldown.ts`:
  - pacientes e papéis desconhecidos continuam com cooldown de 7 dias após `Agora não`;
  - psicólogos têm 48 horas nas duas primeiras recusas;
  - a partir da terceira recusa de psicólogo, o cooldown volta para 7 dias;
  - a contagem local fica em `lectum.pwaInstall.dismissCount`;
  - `lectum.pwaInstall.neverShowAgain` virou chave legada e não bloqueia mais a exibição.
- A copy para psicólogos reforça voltar rápido para contatos, perfil e rotina profissional.
- Validação do refinamento:
  - `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/app/app/settings/notifications/logic.tsx src/utils/prompt-cooldown.ts`;
  - `pnpm --dir frontend exec tsc --noEmit --pretty false`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir frontend build`;
  - `pnpm check`;
  - browser local mobile `390x844` com usuário real de desenvolvimento `psicologo`, confirmando ausência de `Não mostrar novamente`, chave legada `lectum.pwaInstall.neverShowAgain` ignorada, cooldown de 48h nas duas primeiras recusas e 7 dias na terceira.
- ADR criado: `adrs/0183-insistencia-controlada-atalho-notificacoes-psicologos.md`.

## Refinamento 2026-06-30 - exibição somente após cadastro concluído

- Pedido de produto: a modal de atalho/PWA não deve aparecer durante cadastro/onboarding; para psicólogos, mesmo com maior insistência, só deve aparecer após finalizar escolha de plano, WhatsApp e configuração/publicação do perfil profissional.
- Implementação ajustada em `frontend/src/utils/prompt-cooldown.ts` e `frontend/src/components/pwa-install-prompt.tsx`:
  - pacientes só ficam elegíveis após `patient_profile.onboarding_completed_at`;
  - psicólogos só ficam elegíveis com assinatura ativa real, WhatsApp salvo e `psychologist_profile.published=true`;
  - o cooldown/backoff mais curto para psicólogos permanece, mas apenas após esse marco de cadastro concluído.
- A alteração é frontend-only, sem package novo, backend, endpoint ou migration.
- Validação de escopo executada:
  - `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/utils/prompt-cooldown.ts`;
  - `pnpm --dir frontend exec eslint src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/utils/prompt-cooldown.ts`;
  - `pnpm --dir frontend exec tsc --noEmit --pretty false`;
  - `pnpm --dir frontend build`;
  - browser local mobile `390x844` em `next start` na porta `3002`, confirmando prompt oculto para psicólogo incompleto e visível após assinatura ativa + WhatsApp + `published=true`.
- `pnpm --dir frontend check` e `pnpm check` foram reexecutados, mas ficaram bloqueados por alterações pendentes fora deste refinamento em `frontend/src/app/app/community/[slug]/post/[id]/logic.tsx` e `frontend/src/app/app/community/[slug]/logic.tsx`.
- ADR atualizado: `adrs/0183-insistencia-controlada-atalho-notificacoes-psicologos.md`.

## Refinamento 2026-07-04 - copy explícita de PWA/atalho

- Pedido de produto: esclarecer que a sugestão não é para "instalar SPA" nem para transformar a Lectum em SPA pura.
- Decisão: manter Next.js App Router e a instalação como PWA/atalho mobile; alterar a copy principal da modal para **"Adicionar a Lectum à tela inicial"** e o CTA para **"Adicionar à tela inicial"**.
- A UI passa a explicar que o ícone é apenas um atalho do site em modo app, não ativa notificações e não muda preferências.
- A mudança preserva o comportamento existente: `beforeinstallprompt` em Android/Chromium, instruções manuais no iOS/Safari, cooldown local, exibição somente após cadastro concluído e nenhuma alteração de backend, package ou migration.
- Validação deste refinamento: `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local mobile `390x844` em `http://127.0.0.1:3006/app/favorites`, com estado local temporário de usuário confirmado apenas para validar a renderização do prompt.
