# ADR-0179: Permissão contextual para notificações no navegador

## Status

Accepted

## Task relacionada

TASK-38

## Contexto

A TASK-29A deixou o canal de notificações pronto: service worker, VAPID, `PushSubscription`,
`notification_subscription`, central in-app e preferências. O comportamento anterior do
`NotificationManager` chamava `Notification.requestPermission()` automaticamente quando havia
usuário confirmado e chave VAPID disponível.

Esse fluxo gerava um prompt nativo sem contexto suficiente. Em uma plataforma de saúde mental, a
permissão do navegador precisa ser separada das preferências de produto e explicada antes de
qualquer prompt nativo, principalmente porque notificações podem aparecer na tela de bloqueio ou na
área de notificações do celular.

A TASK-37 também adicionou a instalação da Lectum como atalho/app-like. Instalação e notificações
devem continuar separadas: o usuário pode adicionar o atalho sem ativar push e pode ativar push sem
instalar atalho.

Refinamento de produto em 2026-06-29 removeu a opção permanente `Não mostrar novamente` dos
prompts e definiu insistência moderada para psicólogos gratuitos ou assinantes: 48 horas nas duas
primeiras recusas e 7 dias da terceira recusa em diante. Pacientes permanecem com insistência baixa
de 7 dias.

Refinamento visual em 2026-06-29 alinhou a modal contextual de notificações ao padrão adotado na
modal de atalho/PWA e nas modais privadas: ícone oficial da Lectum, fundo escuro translúcido e blur
para destacar o diálogo sem misturá-lo com a tela subjacente.

Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente. As referências visuais
auditáveis usadas foram `_product/proto/Notificações.jpg` e
`_product/proto/Configurações de Notificações.jpg`, com adaptação ao shell privado/mobile existente.

## Decisão

- Manter `NotificationManager` como ponto de montagem do canal push no shell privado, mas refatorar
  o fluxo em `frontend/src/hooks/notification/index.tsx` para separar:
  - registro idempotente do service worker;
  - detecção de suporte do browser;
  - leitura de `Notification.permission`;
  - obtenção real da chave VAPID pelo endpoint existente;
  - revalidação/registro de `PushSubscription` apenas quando a permissão já é `granted`;
  - chamada a `Notification.requestPermission()` somente dentro de ação explícita do usuário.
- Criar um prompt contextual da Lectum, mobile-first, com a copy:
  - `Ative notificações da Lectum`;
  - explicação de respostas, interações e contatos;
  - aviso de que notificações podem aparecer no celular;
  - CTAs `Ativar notificações` e `Agora não`.
- Renderizar o prompt como `role="dialog"`/`aria-modal="true"` dentro de overlay mobile-first:
  - fundo escuro translúcido com `backdrop-blur`;
  - card inferior em mobile e centralizado em telas maiores;
  - ícone `/icon.png` via `next/image`, mantendo `BellRing` apenas no CTA.
- Usar `localStorage` apenas para preferência local por navegador/dispositivo:
  - `lectum.notificationsPermissionPrompt.dismissedUntil`;
  - `lectum.notificationsPermissionPrompt.dismissCount`.
- Não consultar mais a chave permanente legada `lectum.notificationsPermissionPrompt.neverAskAgain`.
- Definir cooldown de `Agora não` por papel:
  - pacientes e papéis desconhecidos: 7 dias;
  - psicólogos: 48 horas nas duas primeiras recusas e 7 dias da terceira em diante.
- Reutilizar a coordenação criada na TASK-37 via `sessionStorage`:
  - chave `lectum.activePrompt`;
  - valor desta task `notification-permission`;
  - valor da TASK-37 `pwa-install`.
- No cleanup do bootstrap do `NotificationManager`, liberar a assinatura local de boot quando o
  mesmo ciclo é cancelado, para que o double-effect do React/Next em desenvolvimento não deixe
  `isChecking` preso e não impeça a validação local da modal.
- Dar prioridade prática ao prompt de atalho quando ambos são elegíveis no mesmo momento:
  - TASK-37 usa delay menor;
  - TASK-38 usa delay maior;
  - a reserva de `lectum.activePrompt` impede empilhamento.
- Integrar `/app/settings/notifications` com um card honesto de status do navegador:
  - suporte indisponível;
  - VAPID ausente;
  - permissão `denied`;
  - permissão `granted`;
  - permissão `default` com CTA contextual.

## Consequências

- O prompt nativo do navegador não abre mais automaticamente em montagem, hidratação ou troca de
  sessão.
- O fluxo continua idempotente em produção e fica validável também no browser local de
  desenvolvimento com React Strict Mode/double-effect ativo.
- Se a permissão já estiver `granted`, a assinatura push continua sendo criada/revalidada de forma
  automática e idempotente, pois o consentimento nativo já existe.
- Se a permissão estiver `default`, o usuário vê contexto da Lectum antes do prompt nativo.
- Se a permissão estiver `denied`, o app não tenta pedir novamente e orienta o usuário a reativar no
  navegador/sistema.
- Psicólogos recebem reexibição mais próxima quando escolhem `Agora não`, mas com backoff para 7
  dias após recusas repetidas.
- Não existe mais opt-out permanente no prompt; a recusa é sempre adiamento local por cooldown.
- A modal contextual deixa de competir visualmente com listas/cards da tela privada: o overlay
  bloqueia a mistura visual e mantém o foco no consentimento antes do prompt nativo.
- O ícone exibido no prompt é o mesmo ativo da Lectum, sem `<img>` cru.
- Sem suporte a `Notification`, service worker ou `PushManager`, a UI degrada para a central in-app.
- Sem VAPID real, a UI não promete entrega push.
- Nenhum pacote novo foi instalado.
- A separação entre preferências de produto, permissão nativa e subscription técnica fica explícita:
  - `notification_preference` decide categorias;
  - `Notification.permission` decide autorização do navegador;
  - `notification_subscription` guarda a inscrição técnica.

## Validação

- `pnpm --dir frontend exec biome check --write src/hooks/notification/index.tsx src/app/app/settings/notifications/logic.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em viewport mobile `390x844`, cobrindo:
  - permissão `default`: prompt contextual visível e `Notification.requestPermission()` chamado só
    após clique em `Ativar notificações`;
  - permissão `granted`: subscription revalidada sem prompt contextual;
  - permissão `denied`: card de orientação sem chamada a `requestPermission`;
  - `Agora não`: cooldown local respeitado;
  - `Não mostrar novamente`: ausente da UI;
  - overlay escuro com blur e ícone `/icon.png` via `next/image` visíveis na modal contextual;
  - React/Next dev: bootstrap não fica preso em `isChecking` após cleanup do primeiro effect;
  - coordenação com TASK-37: `lectum.activePrompt` impede empilhamento simultâneo.
- Refinamento 2026-06-29 validado no ADR-0183 para backoff por perfil e remoção do opt-out
  permanente.
