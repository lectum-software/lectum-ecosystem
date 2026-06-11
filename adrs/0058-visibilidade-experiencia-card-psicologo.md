# ADR-0058: Nome semibold e visibilidade real do tempo de experiencia nos cards

## Status

Accepted

## Task relacionada

Ajustes de UX na tela `/app/psychologists` e nos cards de psicologos.

## Contexto

O card do psicologo exibe nome, profissao e tempo de experiencia. O produto tambem permite que o profissional
desmarque a opcao de exibir tempo de experiencia na edicao de perfil, expondo essa decisao pelo campo real
`show_experience_tag` no contrato da descoberta.

## Decisao

- Renderizar o nome do psicologo com peso semibold nos cards afetados.
- Omitir o tempo de experiencia quando `show_experience_tag === false`.
- Manter o tempo de experiencia quando o campo esta ausente ou verdadeiro, preservando compatibilidade com dados existentes.
- Nao alterar API, backend, Prisma ou dados do psicologo.

## Consequencias

- O card fica visualmente menos pesado, com hierarquia mais adequada.
- A preferencia real do profissional sobre exibir experiencia passa a ser respeitada na listagem/card.
- A profissao continua aparecendo mesmo quando o tempo de experiencia e ocultado.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validacao local HTTP de `/app/psychologists`.
