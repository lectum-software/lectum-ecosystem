# Lectum — Frontend

Aplicação web de pacientes e psicólogos, com Next.js, React e TypeScript.
O repositório reúne quatro aplicações para desenvolvimento; este frontend tem instalação,
build e deploy separados do backend, Admin e serviço de vídeo.

## Antes de começar

1. Confirme `git branch --show-current`. Trabalhe em **homolog**; pare se estiver em `main`.
2. Leia [instruções do projeto](../AGENTS.md) e a [task vigente](../_product/tasks/README.md).
3. Use **pnpm** e o lockfile desta aplicação. Não use npm, Yarn ou Bun como alternativa.
4. Configure somente variáveis autorizadas a partir de [.env.example](.env.example).
   Não copie credenciais de produção para desenvolvimento nem inclua segredos no Git.
   Variáveis `NEXT_PUBLIC_*` são públicas no navegador: nunca devem conter segredos.

## Desenvolvimento local

Na raiz do repositório, com as dependências instaladas conforme a task:

```bash
pnpm --dir frontend dev
```

Abra `http://localhost:3000` no navegador. Os fluxos integrados dependem do backend e das
integrações reais da task; não substituir por mocks para declarar o fluxo concluído.

## Padrões e validação

- [Arquitetura](../_product/tasks/ARCHITECTURE.md): reutilize módulos, callers e componentes existentes.
- [Packages](../_product/tasks/PACKAGES.md): nova dependência exige validação e ADR.
- [Protótipos](../_product/tasks/PROTO-INVENTORY.md): Builder/Quick Copy e exportações locais; UI mobile-first.
- Formulários: fundação TASK-02, React Hook Form, Zod, `src/hooks/form` e `src/components/controllers`.

```bash
pnpm --dir frontend check
pnpm --dir frontend build
```

Mudanças visuais também exigem Browser local e reteste em homologação; check/build não
substituem testes de interação, Safari/Chrome e dispositivos reais.

## Publicação e versão

- **Push em homolog dispara deploy automático.** Avise antes; valide o deploy e os fluxos afetados.
- Nunca faça commit/push direto em `main`. Produção requer homologação validada, PR revisado
  `homolog` → `main`, checks e smoke após o merge, sem excluir `homolog`.
- Antes de cada novo commit do agente, na raiz, execute uma vez `pnpm version:bump`, inclua os
  **cinco** manifests (raiz, backend, frontend, admin e video) e rode `pnpm check:version`.
  Ao repetir um commit que falhou, não repita o bump.
- A versão deste build é consultável em `/version`, pública, sem cache, não indexável e
  fora da navegação/sitemap. Backend usa `/ping`; Admin e vídeo também possuem `/version`.
  O serviço de vídeo permanece restrito à rede privada: não o exponha para consultar a versão.
- Mudanças de API devem tolerar rollout entre versões. Nova env obrigatória exige alerta
  de deploy com nome, aplicação, ordem e impacto, nunca com o valor.

Dados, uploads, pagamentos e filas publicados são persistentes; não execute reset, seed
destrutivo nem limpeza em massa. A conclusão depende dos critérios reais da task, não
apenas de o deploy aparecer como pronto.
