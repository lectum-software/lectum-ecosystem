# TASK-38: Permissão contextual de notificações no navegador

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-38 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Conta / Experiência app-like |
| Status | Completed |
| Dependências | TASK-12, TASK-29A |
| ADR alvo | ADR-0179 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md` seção `Notificações`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/TASK-29a-notificacoes-fundacao.md`
- `_product/tasks/TASK-29b-notificacoes-eventos.md`
- `_product/tasks/TASK-37-instalacao-lectum-app-atalho.md`, para preservar a separação entre atalho/PWA e notificações.

## Contexto

A TASK-29A já implementou a fundação de notificações: central in-app, preferências, service worker, `notification_subscription`, VAPID, dispatcher e `NotificationManager`. Hoje o `NotificationManager` registra o service worker e tenta chamar `window.Notification.requestPermission()` automaticamente quando encontra usuário confirmado e VAPID disponível.

Esse comportamento funciona tecnicamente, mas não é a melhor experiência: o prompt nativo do navegador pode aparecer sem contexto suficiente, aumentando chance de bloqueio, e em uma plataforma de saúde/psicologia é importante explicar privacidade antes de pedir permissão.

A decisão de produto é adicionar um prompt contextual da Lectum antes do prompt nativo. O navegador só deve pedir permissão após uma ação explícita do usuário no CTA.

## Objetivo

Trocar o pedido automático de permissão de notificações por uma experiência contextual, mobile-first e respeitosa, permitindo que o usuário entenda o valor e a implicação de privacidade antes de ativar notificações push no navegador.

Copy base recomendada:

> **Ative notificações da Lectum**  
> Receba avisos importantes sobre respostas, interações e contatos. As notificações podem aparecer no seu celular; ative apenas se isso fizer sentido para você.

CTAs:

- `Ativar notificações`
- `Agora não`
- `Não mostrar novamente`

## Pré-requisitos e bloqueios

- TASK-29A concluída, com `NotificationManager`, service worker e endpoints de subscription funcionando.
- VAPID deve continuar sendo requisito para push real. Sem `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_EMAIL`, a UI não deve prometer entrega push.
- Consultar `PACKAGES.md`; a expectativa é **não instalar pacote novo**.
- Consultar `PROTO-INVENTORY.md`; não há protótipo específico para este prompt, então reutilizar a linguagem visual mobile das telas de notificações/configurações e registrar a limitação de Builder/Quick Copy quando aplicável.
- Se o navegador não suportar `Notification`, `PushManager` ou service worker, não exibir CTA de ativação push; degradar para notificações in-app.
- Se o usuário já negou permissão no navegador (`Notification.permission === "denied"`), não tentar pedir novamente; orientar a reativação nas configurações do navegador/sistema.

## Escopo frontend

- Refatorar `frontend/src/hooks/notification/index.tsx` para separar:
  - registro do service worker;
  - detecção de suporte e status da permissão;
  - inscrição push quando a permissão já estiver `granted`;
  - pedido de permissão acionado somente por clique/toque explícito do usuário.
- Criar ou adaptar componente client-side de prompt contextual no shell privado/mobile:
  - exibir apenas para usuário autenticado e confirmado;
  - exibir apenas quando VAPID estiver configurado e browser suportar push;
  - não exibir se já estiver `granted`, `denied`, `dismissed` em cooldown ou marcado como `Não mostrar novamente`;
  - respeitar estado local por navegador/dispositivo via `localStorage`, sem backend.
- Integrar com `/app/settings/notifications` quando fizer sentido:
  - se push estiver bloqueado/negado no navegador, mostrar mensagem honesta;
  - se o usuário ativar preferências de push mas a permissão do navegador ainda não estiver concedida, oferecer o CTA contextual.
- Garantir que `window.Notification.requestPermission()` só seja chamado a partir do CTA `Ativar notificações`.
- Coordenar com a TASK-37 para não empilhar prompts:
  - não mostrar prompt de atalho/PWA e prompt de notificações simultaneamente;
  - se necessário, aplicar cooldown/ordem de prioridade e registrar no ADR.

## Escopo backend

- Nenhuma alteração backend prevista.
- Nenhuma migration prevista.
- Nenhum endpoint novo previsto.
- Reusar `notification_subscription/key` e `notification_subscription/store` já existentes.

## Fora do escopo

- Criar novos eventos de domínio de notificação; isso pertence à TASK-29B.
- Alterar política de digest, prioridade ou conteúdo de push.
- Implementar app nativo.
- Implementar PWA/atalho; isso pertence à TASK-37.
- Pedir permissão de notificação junto com instalação de atalho.
- Criar mocks, subscriptions fake, VAPID fake ou endpoint simulado.
- Instalar pacote novo sem validação de `PACKAGES.md` e ADR.

## Contrato técnico detalhado

Frontend esperado:

- `NotificationManager` não deve abrir prompt nativo automaticamente durante montagem, hidratação ou troca de sessão.
- A função que chama `Notification.requestPermission()` deve ficar isolada e só ser executada após gesto explícito do usuário.
- Se `Notification.permission === "granted"`, o fluxo pode inscrever/revalidar `PushSubscription` de forma automática e idempotente, pois o consentimento do navegador já existe.
- Se `Notification.permission === "default"`, exibir prompt contextual antes do prompt nativo.
- Se `Notification.permission === "denied"`, não chamar `requestPermission`; renderizar instrução curta para reativar no navegador/sistema, sem insistência.
- Persistência local sugerida:
  - `lectum.notificationsPermissionPrompt.dismissedUntil` para `Agora não`;
  - `lectum.notificationsPermissionPrompt.neverAskAgain` para `Não mostrar novamente`.
- Não acessar `localStorage`, `navigator`, `window.Notification` ou `matchMedia` durante SSR.
- UI mobile-first (~390px), com progressão desktop quando aplicável.
- Usar tokens de tema (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`, `text-primary`, etc.), sem cores hardcoded.
- Não usar `<img>` cru; se houver imagem, usar `Image` de `next/image`. Ícones devem preferir `lucide-react` quando houver equivalente.
- Mensagens visíveis em PT-BR.

Regras de privacidade/saúde:

- A copy deve explicar que notificações podem aparecer no celular/lock screen dependendo do sistema.
- Não usar tom alarmista nem prometer urgência clínica.
- Não revelar conteúdo sensível no prompt contextual.
- Manter controle do usuário claro: pode recusar, deixar para depois ou ajustar preferências.

Packages usados:

- Nenhum pacote novo esperado.
- Se for identificado pacote indispensável, validar `PACKAGES.md`, registrar ADR e justificar por que APIs nativas/Next.js não bastam.

## Critérios de aceite

- [x] O prompt nativo do navegador (`Notification.requestPermission`) não aparece automaticamente ao entrar no app, hidratar sessão ou montar `NotificationManager`.
- [x] O prompt contextual da Lectum aparece somente quando o usuário está autenticado/confirmado, o browser suporta push, VAPID está disponível e a permissão está `default`.
- [x] Clicar em `Ativar notificações` dispara o prompt nativo e, quando concedido, cria/revalida `PushSubscription` real e persiste via endpoint existente.
- [x] `Agora não` aplica cooldown local; `Não mostrar novamente` impede nova exibição naquele navegador/dispositivo.
- [x] Quando a permissão está `denied`, a UI não chama `requestPermission` e mostra orientação honesta para reativar no navegador/sistema.
- [x] Quando a permissão já está `granted`, a subscription continua sendo revalidada de forma idempotente sem mostrar prompt contextual.
- [x] A experiência não empilha prompt de instalação da TASK-37 e prompt de notificações ao mesmo tempo.
- [x] A copy usa **"Ative notificações da Lectum"** e explica a implicação de privacidade de notificações visíveis no celular.
- [x] A task não altera eventos de domínio, política de digest ou conteúdo de push.
- [x] Nenhum mock, subscription fake, VAPID fake ou endpoint simulado foi usado.
- [x] Nenhum pacote novo foi instalado, salvo se `PACKAGES.md` e ADR justificarem explicitamente.
- [x] UI mobile-first; nenhum `<img>` cru em UI, somente `next/image` quando imagem for renderizada.
- [x] Builder/Quick Copy foi usado quando disponível, ou a limitação foi registrada e as referências locais de notificações foram citadas.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erro.
- [x] Browser local validado em viewport mobile, cobrindo `default`, `granted`, `denied`, `Agora não` e `Não mostrar novamente`.
- [x] ADR criado ou atualizado em `adrs/` registrando a separação entre consentimento contextual, permissão nativa e preferências de notificação.
- [x] Commit criado com mensagem convencional e publicado com `git push` (push tentado; registrar bloqueio se credenciais/timeout impedirem publicação).

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em viewport mobile (~390px) com cenários:
  - permissão `default`: prompt contextual aparece; prompt nativo só aparece após CTA;
  - permissão `granted`: subscription é criada/revalidada sem prompt;
  - permissão `denied`: orientação é exibida e `requestPermission` não é chamado;
  - `Agora não`: cooldown respeitado;
  - `Não mostrar novamente`: prompt não reaparece.

## Notas de execução

- Evitar prompt no primeiro segundo de uso; preferir contexto privado/autenticado e interação com a área de notificações/configurações, ou uma exibição discreta após o usuário já estar navegando.
- Se a execução definir número de dias de cooldown, registrar no ADR.
- Não confundir três camadas distintas:
  1. preferência de produto (`notification_preference`);
  2. permissão do navegador (`Notification.permission`);
  3. subscription técnica (`notification_subscription`).
- O texto deve manter o produto no feminino: **a Lectum**.

## Execução 2026-06-29

- Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente; as referências
  auditáveis consultadas foram `_product/proto/Notificações.jpg` e
  `_product/proto/Configurações de Notificações.jpg`.
- `frontend/src/hooks/notification/index.tsx` foi refatorado para separar suporte do navegador,
  registro do service worker, leitura de permissão, obtenção de VAPID, revalidação de
  `PushSubscription` e pedido explícito de permissão.
- `Notification.requestPermission()` ficou isolado em `requestPermissionAndSubscribe()` e só é
  chamado após clique/toque em `Ativar notificações`.
- Quando `Notification.permission === "granted"`, a subscription real é criada/revalidada e
  persistida pelo endpoint existente `/api/private/notification_subscription/store`.
- Quando `Notification.permission === "default"`, o prompt contextual mobile-first da Lectum é
  exibido com cooldown local de 7 dias em `Agora não` e bloqueio por navegador/dispositivo em
  `Não mostrar novamente`.
- Quando `Notification.permission === "denied"`, `/app/settings/notifications` orienta reativação
  nas configurações do navegador/sistema e não chama o prompt nativo.
- `/app/settings/notifications` passou a exibir status honesto para suporte indisponível, VAPID
  ausente, permissão concedida, permissão negada e permissão pendente.
- A coordenação com a TASK-37 usa `sessionStorage` em `lectum.activePrompt`; o valor desta task é
  `notification-permission` e o prompt de notificações usa delay maior para não empilhar com o
  prompt de atalho/PWA.
- Não houve mudança backend, Prisma, eventos de domínio, digest, payload de push ou package novo.
- ADR criado: `adrs/0179-permissao-contextual-notificacoes-navegador.md`.

## Validação executada

- `pnpm --dir frontend exec biome check --write src/hooks/notification/index.tsx src/app/app/settings/notifications/logic.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em viewport mobile `390x844`, cobrindo:
  - permissão `default`: prompt contextual aparece e o prompt nativo só é chamado após CTA;
  - permissão `granted`: subscription é revalidada sem prompt contextual;
  - permissão `denied`: UI orienta reativação e não chama `requestPermission`;
  - `Agora não`: cooldown local respeitado;
  - `Não mostrar novamente`: prompt não reaparece;
  - `lectum.activePrompt`: prompt de atalho e prompt de notificações não aparecem simultaneamente.
