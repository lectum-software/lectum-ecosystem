# ADR 0158: Remoção de sombra em chips do perfil público do psicólogo

## Status

Aceito em 2026-06-23.

## Contexto

O perfil público do psicólogo exibia sombras sutis nos chips de especialidades, nos cards compactos de atendimento e nos itens de formação/títulos. O usuário solicitou remover esse sombreamento para deixar essas informações mais limpas e menos destacadas visualmente.

## Decisão

Remover apenas as sombras dos elementos internos das seções solicitadas, preservando bordas, radius, espaçamentos e hierarquia:

- chips de `Especialidades`;
- cards compactos de `Atendimento` (`Modalidade`, `Abordagens`, `Serviços`, `Público atendido` e `Idiomas`);
- itens de `Formação & Títulos`, incluindo o ícone interno.

As sombras dos cards principais da página foram mantidas para preservar a separação entre seções e o padrão visual do perfil público.

## Consequências

- As informações do perfil ficam mais planas e discretas, sem alterar conteúdo ou comportamento.
- Não altera APIs, domínio, Prisma, storage, upload, ranking, posts, comentários ou WhatsApp.
- Não adiciona dependências.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`