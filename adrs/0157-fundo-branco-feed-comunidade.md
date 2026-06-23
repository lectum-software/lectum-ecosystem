# ADR 0157: Fundo branco no feed da comunidade

## Status

Aceito em 2026-06-23.

## Contexto

O feed da comunidade estava usando uma base cinza-clara (`#F5F7FA`) no conteúdo principal e no cabeçalho sticky de busca/filtros. Após os ajustes recentes de cards brancos e padronização de mídia, o usuário pediu que o background do feed ficasse branco para reduzir ruído visual e aproximar a experiência de uma timeline mais limpa.

## Decisão

Alterar as superfícies de timeline em `frontend/src/app/app/community/[slug]/logic.tsx` para fundo branco em light mode:

- `CommunityFeedLogic` passa a usar `bg-white` no `PrivateTemplate`.
- O header sticky do feed passa a usar `bg-white/95` e `supports-[backdrop-filter]:bg-white/88`.
- `CommunityDetailLogic`, que também renderiza a timeline dentro da comunidade, passa a usar `bg-white`.
- O offset de foco do FAB de criação foi alinhado para `ring-offset-white`.
- O dark mode permanece usando `dark:bg-background`.

## Consequências

- Feed geral e timeline de comunidade ficam visualmente mais limpos e integrados aos cards brancos.
- Não altera regras de domínio, dados, API, Prisma, upload, ordenação ou permissões.
- Não adiciona dependências.
- A tela de detalhe do post não foi alterada por esta decisão.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
