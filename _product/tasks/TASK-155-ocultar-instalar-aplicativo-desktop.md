# TASK-155: Ocultar instalar aplicativo no desktop

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-155 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Experiencia app-like / Perfil privado |
| Status | Completed |
| Dependencias | TASK-12, TASK-21, TASK-37, TASK-152 |
| ADR alvo | ADR-0449 |

## Contexto

Em 2026-08-11, a homologacao mostrou que a linha **Instalar aplicativo** do perfil tambem aparecia no desktop quando o navegador disponibilizava `beforeinstallprompt`. A decisao de produto e que essa entrada manual seja uma descoberta mobile-first para celular/tablet, nao um item de conta exibido na experiencia desktop.

A referencia visual ativa continua sendo o perfil privado mobile-first:

- `_product/proto/Perfil do paciente.jpg`;
- `_product/proto/Perfil - Psicologo.jpg`;
- screenshot de homologacao enviado em 2026-08-11 mostrando a linha indevida no desktop em `/app/perfil`.

O Builder/Quick Copy ativo e `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`, mas nao esta exposto como ferramenta direta neste ambiente. A execucao usa o inventario `_product/tasks/PROTO-INVENTORY.md`, as imagens locais e o screenshot enviado como referencia auditavel.

## Objetivo

Ocultar a opcao **Instalar aplicativo** da secao **Conta** no perfil quando a experiencia atual for desktop, mesmo que o navegador tenha um prompt nativo PWA disponivel. Em mobile, o comportamento da TASK-152 deve permanecer igual.

## Pre-requisitos e bloqueios

- TASK-152 concluida.
- Nenhum requisito externo novo.
- Nenhuma credencial, env, endpoint, storage ou migration nova.
- Consultar `ARCHITECTURE.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Nao instalar pacote novo.
- Nao criar mock, endpoint simulado ou persistencia backend para essa preferencia.

## Escopo frontend

- Ajustar a fundacao compartilhada de PWA para que `shouldShowPwaInstallProfileEntry()` dependa da experiencia mobile.
- Manter a ocultacao quando a Lectum ja estiver instalada/standalone.
- Manter a opcao em mobile quando nao instalada, inclusive com fallback manual quando nao houver prompt nativo.
- Cobrir com teste automatizado o caso desktop com `beforeinstallprompt` disponivel.

## Escopo backend

- Nenhuma alteracao backend.
- Nenhuma migration.
- Nenhum endpoint novo.

## Fora do escopo

- Alterar a modal automatica de instalacao.
- Alterar o design visual da linha mobile.
- Alterar service worker, manifest, VAPID, notificacoes ou offline-first.
- Criar preferencia persistida no backend para controlar visibilidade por dispositivo.

## Impacto em producao e plano de rollout

- Compatibilidade com dados existentes: alteracao frontend-only; todos os usuarios existentes continuam validos.
- Banco: sem alteracao de schema, migration, backfill ou contracao.
- Envs: nenhuma env nova.
- Contratos: nenhum contrato de API novo; frontend novo continua compativel com backend/admin publicados em versoes anteriores.
- Jobs/providers: nenhum efeito externo.
- Ordem de deploy: publicar frontend em homologacao via push em `homolog`; backend/admin nao dependem desta mudanca.
- Rollback: reverter o commit restaura a regra anterior e pode voltar a exibir a linha no desktop quando houver prompt nativo.
- Smoke de homologacao: validar `/app/perfil` em desktop sem a linha **Instalar aplicativo** e confirmar `/version` do frontend.

## Contrato tecnico detalhado

Referencias obrigatorias:

- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `frontend/src/utils/pwa-install.ts`;
- `frontend/src/app/app/profile/logic.tsx`.

Frontend esperado:

- Reutilizar a funcao existente `shouldShowPwaInstallProfileEntry()` em vez de criar regra paralela no perfil.
- Considerar desktop inelegivel para a linha manual mesmo quando `beforeinstallprompt` estiver armazenado.
- Preservar o comportamento mobile e a acao manual sem cooldown.
- UI mobile-first mantida; nenhum `<img>` cru.

Packages usados:

- Nenhum pacote novo.

## Criterios de aceite

- [x] Desktop nao exibe **Instalar aplicativo** em **Perfil > Conta**, mesmo quando `beforeinstallprompt` existe.
- [x] Mobile continua exibindo **Instalar aplicativo** quando a Lectum nao esta instalada/standalone.
- [x] A ocultacao por instalado/standalone continua preservada.
- [x] A linha mobile continua antes de **Editar perfil**, com CTA **Instalar** e sem chevron.
- [x] Nenhum backend, endpoint, migration, env, provider ou package novo foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Dados existentes continuam compativeis; nenhuma migration aplicada foi alterada.
- [x] Envs, ordem de deploy, rollback e smoke de homologacao foram registrados; nao ha env obrigatoria nova.
- [x] Contratos toleram frontend/backend/admin em versoes diferentes durante o rollout.
- [x] Formulario/campos da TASK-02 nao se aplicam porque nao ha formulario, campo ou submit.
- [x] Builder/Quick Copy foi usado quando disponivel, ou as imagens locais/screenshot foram citados.
- [x] Teste automatizado cobre desktop com prompt nativo disponivel.
- [x] `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` executados sem erro.
- [x] ADR atualizado em `adrs/`.
- [x] Versao dos quatro manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit criado com mensagem convencional.
- [x] Commit e push ocorreram em `homolog`; deploy de homologacao foi comunicado e smoke validado.

## Validacao minima

- `pnpm --dir frontend test`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke de homologacao apos push:
  - frontend `/version`;
  - `/app/perfil` desktop sem a linha **Instalar aplicativo**.

## Notas de execucao

- A regra foi centralizada em `frontend/src/utils/pwa-install.ts` para que o perfil continue usando a mesma fundacao criada na TASK-152.
- O prompt automatico permanece separado e continua respeitando a propria elegibilidade mobile.
