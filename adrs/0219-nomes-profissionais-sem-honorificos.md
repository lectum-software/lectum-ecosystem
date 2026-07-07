# ADR-0219: Nomes profissionais sem honoríficos Dr/Dra

## Status

Accepted

## Task relacionada

Pedido direto de produto em 2026-07-07.

## Contexto

A interface de comunidade e descoberta podia exibir nomes de psicólogos com prefixos como `Dr.` ou `Dra.` quando esse texto vinha persistido no nome do usuário ou era adicionado pela UI para perfis verificados. Isso gerava ruído visual e conflitava com a direção de produto de não apresentar psicólogos com honoríficos antes do nome.

## Decisão

Normalizar nomes profissionais na camada de apresentação e nos DTOs públicos/privados de leitura para remover honoríficos iniciais `Dr`, `Dra`, `Doutor` e `Doutora` e títulos profissionais equivalentes quando vierem junto do nome, preservando o nome completo persistido no banco. A mesma normalização passa a alimentar CTAs de WhatsApp, modais de redirecionamento, previews de compartilhamento e autores profissionais em posts/respostas.

## Consequências

- A UI deixa de exibir `Dr.`/`Dra.` antes de nomes de psicólogos mesmo quando o valor bruto ainda contiver o prefixo.
- Não há migration nem alteração de dado persistido; a decisão é reversível e evita mutação silenciosa de cadastro.
- O CTA de WhatsApp passa a usar nome curto normalizado, evitando que o texto de ação comece por honorífico ou título profissional.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- Smoke via `tsx` do utilitário compartilhado: `Dra. Marina Rocha` -> `Marina Rocha`, nome curto `Marina`, e `Psicóloga Bruna Alves` -> `Bruna`.
- Chrome headless no browser local em `http://localhost:3000/psychologists` e `http://localhost:3000/community`: `0` ocorrências de `Dr.`/`Dra.` no DOM renderizado.

## Pendências

- Avaliar em task futura se o cadastro deve bloquear novos nomes profissionais iniciados por honoríficos.
