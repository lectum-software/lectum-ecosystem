# ADR-0449 — Instalar aplicativo no perfil

## Status

Accepted

## Contexto

A TASK-37 já oferece o prompt automático para adicionar a Lectum à tela inicial. Quando o usuário escolhe **Agora não**, esse prompt entra em cooldown local e deixa de ser uma opção visível até a próxima janela de insistência.

A solicitação da TASK-152 é manter uma descoberta manual no perfil privado, dentro de **Conta**, antes de **Editar perfil**, para pacientes, psicólogos gratuitos e psicólogos pagos que ainda não estejam usando a Lectum em modo instalado/standalone.

## Decisão

- Centralizar o estado do `beforeinstallprompt`, detecção de standalone e marcador local de instalação em `frontend/src/utils/pwa-install.ts`.
- Reutilizar essa fundação tanto na modal automática existente quanto na nova ação manual do perfil.
- Exibir a linha **Instalar aplicativo** como ação de conta, com ícone à esquerda, CTA azul **Instalar** à direita e sem chevron.
- Ao tocar:
  - consumir o prompt nativo quando `beforeinstallprompt` estiver disponível;
  - abrir instruções manuais quando o prompt nativo não estiver disponível;
  - preservar o tracking existente pelo evento `lectum:pwa-install-prompt-accepted` quando houver aceite nativo.
- Não aplicar cooldown de **Agora não** à entrada manual do perfil.
- Ocultar a linha quando o navegador estiver em `display-mode: standalone/fullscreen`, `navigator.standalone` ou quando o marcador local `lectum.pwaInstall.installed` indicar instalação já concluída.

## Consequências

- A implementação é frontend-only e não adiciona endpoint, migration, env, job ou provider.
- O prompt automático segue com cooldown e coordenação próprios; a entrada do perfil funciona como alternativa ativa do usuário.
- O estado de instalação continua local ao navegador/dispositivo, compatível com a natureza do PWA.
- Rollback: reverter o commit remove a linha manual e mantém o comportamento anterior da modal automática.

## Impacto de deploy

- Dados existentes: compatíveis, sem backfill ou contração.
- Envs: nenhuma env nova.
- Ordem: publicar frontend em homologação via `homolog`; backend e admin não precisam mudar.
- Compatibilidade de rollout: frontend novo não depende de contrato novo do backend/admin.
- Produção: promoção somente por PR `homolog` → `main` após validação de homologação.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local mobile (~390px) com Chrome headless/CDP:
  - confirmou **Instalar aplicativo** antes de **Editar perfil** em **Conta**;
  - confirmou ação como botão sem chevron;
  - confirmou fallback manual Android;
  - confirmou ocultação por marcador local de instalado;
  - confirmou ocultação em `display-mode: standalone`.

## Task relacionada

- TASK-152 — Instalar aplicativo no perfil
