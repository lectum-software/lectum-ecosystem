# ADR-0183: Insistência controlada para atalho e notificações de psicólogos

## Status

Accepted

## Task relacionada

Refinamento de TASK-37 e TASK-38

## Contexto

A Lectum precisa manter a experiência mobile próxima de um app instalado, especialmente para
psicólogos que usam a plataforma como ferramenta de trabalho. Para esse público, instalar o atalho
e ativar notificações aumenta a chance de responder contatos, acompanhar avaliações e voltar ao
perfil rapidamente.

Ao mesmo tempo, a plataforma atua no contexto de saúde mental. Portanto, a insistência não pode
forçar consentimento, esconder a recusa ou acionar o prompt nativo de notificações sem contexto.
O usuário pediu explicitamente que os prompts mantenham somente a ação **"Agora não"**, removendo
saídas permanentes como **"Não mostrar novamente"**.

Builder/Quick Copy não estava exposto como ferramenta direta neste ambiente. A referência visual
ativa permanece o shell privado/mobile existente e as telas locais já citadas nas TASK-37/TASK-38.

## Decisão

- Unificar a política local de adiamento em `frontend/src/utils/prompt-cooldown.ts`.
- Manter somente a ação secundária **"Agora não"** nos prompts de:
  - instalação/atalho da Lectum;
  - ativação contextual de notificações do navegador.
- Não considerar mais chaves permanentes legadas como bloqueio de exibição:
  - `lectum.pwaInstall.neverShowAgain`;
  - `lectum.notificationsPermissionPrompt.neverAskAgain`.
- Manter essas chaves apenas como legado a ser limpo quando o fluxo for concluído/aceito.
- Aplicar cooldown por papel:
  - pacientes e papéis desconhecidos: 7 dias após **"Agora não"**;
  - psicólogos, gratuitos ou assinantes: as duas primeiras recusas usam 48 horas;
  - da terceira recusa em diante para psicólogos, o cooldown sobe para 7 dias.
- Persistir contagem local de adiamentos por navegador/dispositivo:
  - `lectum.pwaInstall.dismissCount`;
  - `lectum.notificationsPermissionPrompt.dismissCount`.
- Para psicólogos, ajustar copy de valor:
  - atalho: foco em voltar rápido para contatos e perfil;
  - notificações: foco em não perder contatos, avaliações e interações.
- Continuar separando os fluxos:
  - instalar atalho não ativa notificações;
  - ativar notificações não instala atalho;
  - `lectum.activePrompt` segue impedindo empilhamento simultâneo.
- Se `Notification.permission === "denied"`, não há insistência com prompt nativo. A UI apenas
  orienta reativação nas configurações do navegador/sistema.
- Atualização de 2026-06-30: os prompts de atalho/PWA e permissão contextual de notificações só
  ficam elegíveis depois do cadastro concluído:
  - pacientes: `patient_profile.onboarding_completed_at` preenchido;
  - psicólogos: assinatura real ativa (gratuita, paga ou cortesia), WhatsApp salvo e
    `psychologist_profile.published=true`, que é a marca atual de que a configuração do perfil
    profissional passou pelos requisitos de publicação.
- A insistência maior para psicólogos passa a valer somente após esse marco. Antes disso, inclusive
  em `/app/professional/billing/plans`, `/app/professional/whatsapp/verify` e
  `/app/professional/profile/setup`, os prompts não aparecem.

## Consequências

- Psicólogos recebem uma insistência moderada e contextual até instalarem o atalho ou permitirem
  notificações, sem bloquear o uso do produto.
- Pacientes continuam com insistência baixa.
- Não existe opt-out permanente no próprio prompt; existe adiamento por cooldown/backoff.
- A decisão é local por navegador/dispositivo, sem endpoint novo e sem persistência de conta.
- A mudança não altera eventos de domínio, digest, payload de push, service worker ou billing.
- Usuários que haviam usado **"Não mostrar novamente"** em versões anteriores poderão voltar a ver
  os prompts quando elegíveis, porque essa preferência permanente foi removida por decisão de
  produto.
- Usuários em cadastro/onboarding não recebem modais concorrentes antes de terminar as etapas
  obrigatórias. Para psicólogos, isso evita interromper escolha de plano, WhatsApp e setup do perfil
  profissional.

## Validação

- `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/app/app/settings/notifications/logic.tsx src/utils/prompt-cooldown.ts`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile `390x844` com usuário real de desenvolvimento `psicologo`:
  - prompt de atalho exibiu copy profissional e somente `Agora não`;
  - `lectum.pwaInstall.neverShowAgain` foi ignorada como legado;
  - as duas primeiras recusas do atalho geraram cooldown de 48 horas;
  - a terceira recusa do atalho gerou cooldown de 7 dias;
  - prompt de notificações exibiu copy profissional e somente `Agora não`;
  - `lectum.notificationsPermissionPrompt.neverAskAgain` foi ignorada como legado;
  - `Notification.requestPermission()` não foi chamado antes do CTA;
  - a primeira recusa de notificações gerou cooldown de 48 horas.

Validação adicional de 2026-06-30:

- `pnpm --dir frontend exec biome check --write src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/utils/prompt-cooldown.ts`
- `pnpm --dir frontend exec eslint src/components/pwa-install-prompt.tsx src/hooks/notification/index.tsx src/utils/prompt-cooldown.ts`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend build`
- Browser local mobile `390x844` em `next start` na porta `3002`, com estado persistido de psicólogo
  incompleto e completo:
  - psicólogo com assinatura ativa, mas sem WhatsApp e sem perfil publicado: prompt de atalho ficou
    oculto;
  - psicólogo com assinatura ativa, WhatsApp salvo e `published=true`: prompt de atalho apareceu e
    reservou `lectum.activePrompt=pwa-install`.
- A reexecução global de `pnpm --dir frontend check`/`pnpm check` ficou bloqueada por alterações
  pendentes fora deste refinamento em `frontend/src/app/app/community/[slug]/post/[id]/logic.tsx`
  e `frontend/src/app/app/community/[slug]/logic.tsx`.

## Pendências

- Revalidar em dispositivo físico iOS/Android antes de produção.
