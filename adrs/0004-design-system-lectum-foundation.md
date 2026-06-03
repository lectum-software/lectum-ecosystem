# ADR-0004: Design System Lectum Foundation

## Status

Accepted

## Task relacionada

TASK-01 - Design System Lectum Foundation.

## Contexto

Os protótipos base do Lectum indicam uma linguagem visual mobile-first, com fundo frio `#F6F7F8`, superfícies brancas, bordas suaves, tipografia Manrope, azul principal `#308CE8`, cards compactos e componentes de formulário com radius alto.

O frontend já possuía componentes mínimos em `frontend/src/components/ui` e `frontend/src/registry/new-york-v4/ui`, mas ainda usava uma paleta inicial bege/zinc/emerald e fonte Geist.

## Decisão

Adotamos uma foundation visual em CSS tokens globais, sem instalar pacote novo:

- fonte global Manrope via `next/font/google`;
- `--lectum-primary: #308CE8`;
- `--background: #F6F7F8`;
- `--foreground: #0F172A`;
- `--lectum-surface: #FFFFFF`;
- bordas `#E2E8F0` e `#CBD5E1`;
- radius de 12px para cards, 16px para controles e 24px para auth cards;
- sombras suaves baseadas em `rgb(15 23 42 / ...)`.

Componentes base vivem em `frontend/src/components/ui` e componentes registry existentes foram ajustados em vez de criar uma biblioteca paralela. O login atual foi usado como smoke test visual, preservando fluxo real de autenticação e Google OAuth.

## Consequências

- Próximas telas devem reutilizar tokens e componentes existentes antes de criar estilos por página.
- `TASK-02` deve construir a camada de composição de formulários sobre esta foundation.
- A foundation não define contratos de API, dados fake nem endpoints.
- Qualquer pacote visual novo precisa ser justificado em ADR e permitido por `PACKAGES.md`.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação local da rota `/auth/login` via dev server.
