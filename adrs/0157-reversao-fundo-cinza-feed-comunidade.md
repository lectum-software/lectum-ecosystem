# ADR 0157: Reversão do fundo branco no feed da comunidade

## Status

Aceito em 2026-06-23.

## Contexto

Após a alteração que deixou o feed da comunidade com fundo branco, o usuário pediu para desfazer a última mudança e retornar o background à cor anterior. O fundo cinza-claro fazia parte da separação visual entre a página, os cards e o header sticky do feed.

## Decisão

Reverter o fundo do feed e da timeline de comunidade para `#F5F7FA` em light mode:

- `CommunityFeedLogic` volta a usar `bg-[#F5F7FA]` no `PrivateTemplate`.
- O header sticky do feed volta a usar `bg-[#F5F7FA]/95` e `supports-[backdrop-filter]:bg-[#F5F7FA]/88`.
- `CommunityDetailLogic` volta a usar `bg-[#F5F7FA]`.
- O offset de foco do FAB de criação volta para `ring-offset-[#F5F7FA]`.
- O dark mode permanece com `dark:bg-background`.

## Consequências

- O feed retorna ao visual anterior, com contraste suave entre fundo, cards e áreas de interação.
- O ADR anterior da mudança para fundo branco foi removido por não representar mais o estado atual do produto.
- Não altera regras de domínio, dados, API, Prisma, upload, ordenação ou permissões.
- Não adiciona dependências.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
