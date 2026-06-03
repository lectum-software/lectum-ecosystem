# Lectum Agent Instructions

Estas instruções valem para agentes de IA trabalhando neste workspace.

## Contexto do Projeto

- O repositório reúne `backend/` e `frontend/` apenas para facilitar o desenvolvimento.
- Em produção, frontend e backend devem continuar sendo tratados como aplicações separadas.
- O produto Lectum é uma plataforma web responsiva para psicólogos e pacientes.
- O desenvolvimento deve seguir spec-driven development: a IA executa uma task bem definida, valida, registra decisões e só então avança.

## Fontes de Verdade

1. Tasks sequenciais: `_product/tasks/README.md`.
2. Arquitetura obrigatória: `_product/tasks/ARCHITECTURE.md`.
3. Política de packages: `_product/tasks/PACKAGES.md`.
4. Product docs: `_product/Lectum PRD.pdf` e `_product/Fluxogramas do Produto.pdf`.
5. Design/protótipos: Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` e imagens em `_product/proto`.
6. ADRs: `adrs/`.

## Regras Obrigatórias

- Nunca usar mocks, dados fake permanentes ou endpoints simulados para concluir uma task.
- Se um requisito externo estiver ausente, parar a task e registrar a decisão pendente em vez de mascarar com mock.
- Antes de implementar tela, consultar `_product/tasks/PROTO-INVENTORY.md`.
- Usar Builder/Quick Copy quando disponível no cliente; se a ferramenta não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Não usar Figma como fonte ativa, salvo pedido explícito do usuário.
- Não aceitar código gerado por Builder CLI como final sem adequar à arquitetura do projeto.
- Formulários/campos de produto devem usar a fundação da `TASK-02`: React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`. Campos ocupam largura total e o slot de erro tem altura fixa (sem layout shift).
- Toda UI é **mobile-first** e isso deve ser explícito na execução da task (base ~390px dos protótipos, progredindo para telas maiores).
- **Nunca usar `<img>`**; sempre o componente `Image` de `next/image`.
- Cada task concluída deve atualizar seus critérios de aceite de `[ ]` para `[x]`.
- Cada task concluída deve criar ou atualizar pelo menos um ADR quando houver decisão arquitetural, integração, regra de domínio, fluxo crítico ou trade-off relevante.
- Cada task concluída deve gerar commit próprio.
- Não usar a pasta `sample/` como fonte ativa de implementação futura, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Antes de criar estrutura nova, verificar `_product/tasks/ARCHITECTURE.md`.
- Antes de instalar pacote novo, verificar `_product/tasks/PACKAGES.md` e registrar ADR.

## Validação

Use estes comandos como baseline:

- Raiz: `pnpm check`
- Backend: `pnpm --dir backend check` e, quando houver mudança estrutural, `pnpm --dir backend build`
- Frontend: `pnpm --dir frontend check` e, quando houver mudança visual/rota, `pnpm --dir frontend build`

Para mudanças de interface, também validar manualmente no browser local depois de subir o dev server apropriado.

## Stack Atual

- Backend: Express 5, Prisma 7, PostgreSQL adapter, Passport/JWT/Google OAuth, Biome, TypeScript.
- Frontend: Next.js 16, React 19, Tailwind CSS 4, TanStack Query 5, Redux Toolkit, Biome, ESLint, TypeScript.
- Package manager: pnpm.
