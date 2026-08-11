# TASK-152: Instalar aplicativo no perfil

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-152 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Experiência app-like / Perfil privado |
| Status | Completed |
| Dependências | TASK-12, TASK-21, TASK-37 |
| ADR alvo | ADR-0449 |

## Contexto

A TASK-37 já tornou a Lectum instalável como PWA/atalho e criou o prompt contextual com a ação **Agora não**. O ajuste solicitado em 2026-08-10 adiciona uma entrada permanente e discreta no perfil privado para que pacientes, psicólogos gratuitos e psicólogos pagos encontrem a instalação depois de dispensar o prompt automático.

A referência visual ativa segue o perfil privado mobile-first do produto:

- `_product/proto/Perfil do paciente.jpg`;
- `_product/proto/Perfil - Psicólogo.jpg`;
- screenshots enviados em conversa em 2026-08-10 mostrando a seção **Conta** no perfil do paciente e do psicólogo.

O Builder/Quick Copy ativo é `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`, mas não está exposto como ferramenta direta neste ambiente. Portanto, a execução deve usar o inventário `_product/tasks/PROTO-INVENTORY.md`, as imagens locais e os screenshots enviados como referência auditável.

## Objetivo

Exibir em **Perfil > Conta**, antes de **Editar perfil**, a opção **Instalar aplicativo** para usuários que ainda não estejam usando a Lectum em modo instalado/standalone. A linha deve ter ação explícita **Instalar** em azul no lado direito, sem chevron, e permitir acionar o prompt nativo ou instruções manuais de instalação.

## Pré-requisitos e bloqueios

- TASK-12, TASK-21 e TASK-37 concluídas.
- Nenhum requisito externo novo.
- Nenhuma credencial, env ou storage novo.
- Consultar `ARCHITECTURE.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Não instalar pacote novo.
- Não criar mock, endpoint simulado ou persistência backend para essa preferência.

## Escopo frontend

- Atualizar o perfil privado compartilhado (`/app/perfil` e compatibilidade `/app/profile`) para incluir a opção **Instalar aplicativo** dentro de **Conta**, antes de **Editar perfil**.
- A opção deve aparecer para pacientes, psicólogos gratuitos e psicólogos pagos quando a Lectum não estiver em standalone/instalada neste navegador.
- A linha deve usar o padrão visual da lista de Conta, com ícone à esquerda, label no centro e texto azul **Instalar** à direita, sem seta.
- Ao tocar na opção:
  - usar `beforeinstallprompt` quando disponível;
  - quando não houver prompt nativo, mostrar instruções manuais compatíveis com iOS/Safari, Android/Chromium ou navegador genérico;
  - não aplicar cooldown de **Agora não** à entrada manual do perfil.
- Reutilizar a infraestrutura existente do PWA da TASK-37.

## Escopo backend

- Nenhuma alteração backend.
- Nenhuma migration.
- Nenhum endpoint novo.

## Fora do escopo

- App nativo iOS/Android.
- Permissão de notificações, Web Push ou offline-first.
- Persistência backend do estado de instalação.
- Alterar o card de upgrade do psicólogo gratuito.
- Alterar a modal automática de instalação além do necessário para compartilhar a ação com a linha do perfil.

## Impacto em produção e plano de rollout

- Compatibilidade com dados existentes: alteração frontend-only; todos os usuários existentes continuam válidos.
- Banco: sem alteração de schema, migration, backfill ou contração.
- Envs: nenhuma env nova.
- Contratos: nenhum contrato de API novo; frontend novo continua compatível com backend/admin publicados em versões anteriores.
- Jobs/providers: nenhum efeito externo.
- Ordem de deploy: publicar somente frontend em homologação via push em `homolog`.
- Rollback: reverter o commit remove a linha do perfil e preserva o prompt automático existente.
- Smoke de homologação: validar `/app/perfil` em viewport mobile para paciente, psicólogo gratuito e psicólogo pago; confirmar presença da opção quando não instalado, ausência em standalone e fallback manual quando não há prompt nativo.

## Contrato técnico detalhado

Referências obrigatórias:

- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `frontend/src/components/pwa-install-prompt.tsx`;
- `frontend/src/app/app/profile/logic.tsx`.

Frontend esperado:

- Reutilizar o shell e o perfil existentes.
- Manter componente client-side para browser APIs (`beforeinstallprompt`, `matchMedia`, `navigator`, `localStorage`).
- Não acessar `localStorage` durante SSR.
- Compartilhar o evento `beforeinstallprompt` entre a modal automática e a entrada manual do perfil, sem criar sistema paralelo.
- Preservar tracking existente de aceite de PWA via evento `lectum:pwa-install-prompt-accepted`.
- UI mobile-first (~390px), com tokens de tema e sem cores hardcoded.
- Nenhum `<img>` cru; usar `next/image` apenas se imagem for renderizada.

Packages usados:

- Nenhum pacote novo.

## Critérios de aceite

- [x] `/app/perfil` exibe **Instalar aplicativo** dentro de **Conta**, antes de **Editar perfil**, para paciente, psicólogo gratuito e psicólogo pago quando a Lectum não está em standalone/instalada.
- [x] A linha usa ícone à esquerda e texto azul **Instalar** à direita, sem chevron, mantendo o padrão visual mobile-first do perfil.
- [x] O clique/tap na linha aciona o prompt nativo quando `beforeinstallprompt` está disponível.
- [x] Quando não há prompt nativo, o clique/tap abre instruções manuais para iOS/Safari, Android/Chromium ou navegador genérico.
- [x] A opção manual do perfil ignora o cooldown de **Agora não** do prompt automático e some quando a Lectum está em standalone ou marcada como instalada no navegador.
- [x] Nenhuma permissão de notificação, Web Push, offline-first, backend, endpoint ou migration foi adicionada.
- [x] Nenhum pacote novo foi instalado.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Dados existentes continuam compatíveis; nenhuma migration aplicada foi alterada.
- [x] Envs, ordem de deploy, rollback e smoke de homologação foram registrados; não há env obrigatória nova.
- [x] Contratos toleram frontend/backend/admin em versões diferentes durante o rollout.
- [x] Formulários/campos da TASK-02 não se aplicam porque não há formulário, campo ou submit.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/screenshot foram citados.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erros.
- [x] Browser local mobile validado para a opção no perfil e para a ocultação em standalone.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Versão dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; o deploy de homologação foi comunicado e não houve push direto em `main`.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local com viewport mobile (~390px), validando:
  - opção na seção **Conta** antes de **Editar perfil**;
  - CTA **Instalar** sem chevron;
  - fallback manual sem prompt nativo;
  - ocultação quando `display-mode: standalone` ou equivalente.

## Notas de execução

- O item do perfil é um ponto de descoberta persistente da instalação, não um novo prompt automático.
- A ação manual não deve gravar cooldown quando o usuário apenas fecha as instruções.
- O estado de instalação permanece local ao navegador/dispositivo, como na TASK-37.

## Resultado da execução

- Implementado em `frontend/src/app/app/profile/logic.tsx`, antes de **Editar perfil** na seção **Conta**, sem ramificar por plano ou papel; por isso a mesma linha atende paciente, psicólogo gratuito e psicólogo pago.
- Criado `frontend/src/utils/pwa-install.ts` para compartilhar `beforeinstallprompt`, detecção de standalone e marcador local de instalação entre a modal automática e a ação manual.
- Criado `frontend/src/hooks/pwa-install/index.tsx` com fallback manual para iOS/Safari, Android/Chromium e navegador genérico.
- Ajustado `frontend/src/components/pwa-install-prompt.tsx` para reutilizar a fundação compartilhada e preservar o cooldown da modal automática.
- Nenhum backend, admin, migration, env, provider, permissão de notificação, Web Push ou package novo foi alterado/adicionado.
- ADR criado: `adrs/0449-instalar-aplicativo-perfil.md`.
- Builder/Quick Copy não estava disponível como ferramenta direta; a validação visual usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/Perfil do paciente.jpg`, `_product/proto/Perfil - Psicólogo.jpg` e os screenshots enviados.
- Browser local mobile (~390px) validou: item antes de **Editar perfil**, botão sem chevron, fallback Android, ocultação por marcador local de instalado e ocultação em `display-mode: standalone`.
- Validações executadas sem erro: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm version:bump`, `pnpm check:version` e novo `pnpm --dir frontend build` após o bump para versão `0.1.33`.
