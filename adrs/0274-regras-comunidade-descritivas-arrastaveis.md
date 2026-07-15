# ADR 0274 - Regras de comunidade descritivas e arrastaveis

Data: 2026-07-15

## Status
Aceita

## Contexto

O bloco **Regras da comunidade** no Admin exibia titulo, tag de status, botoes de subir/descer, acao de desativar e formulario inline de criacao. No site publico, cada regra tambem era renderizada com titulo. O pedido atual simplifica a gestao para regras apenas descritivas, com ordenacao por arrastar e criacao em modal.

## Decisao

- A UI do Admin passa a tratar o titulo da regra como detalhe interno de compatibilidade com o contrato atual do backend; o valor enviado e derivado do texto descritivo.
- A criacao e edicao usam somente um campo de texto com React Hook Form/Zod e controllers existentes.
- A reordenacao usa HTML Drag and Drop nos cards, persistindo a troca de `position` nos endpoints reais ja existentes.
- A tag de quantidade foi removida; a contagem fica no texto auxiliar: `N regras exibidas na comunidade.`
- Editar e remover ficam como botoes icon-only com `aria-label`/`title`.
- O site publico renderiza apenas a descricao das regras, preservando a ordenacao por `position`.

## Consequencias

- Nao houve package novo, mock, schema Prisma/migration ou endpoint paralelo.
- O campo `title` permanece no payload para compatibilidade ate que o contrato backend seja simplificado em uma task propria.
- HTML Drag and Drop atende o painel desktop atual; uma experiencia touch dedicada pode ser adicionada no futuro se o uso mobile de ordenacao for priorizado.
- Atualizacao em 2026-07-15: o drag passou a guardar a regra de origem tambem em `useRef` e em um MIME proprio do `dataTransfer`, evitando depender apenas do ciclo assincrono de estado do React entre `dragstart`, `dragenter` e `drop`. O formulario visual continua tendo somente `description`; `title` segue derivado internamente no payload.

## Validacao

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir backend build`
- Smoke local: `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados` retornou 200.
- Smoke local: `GET http://localhost:3000/community/ansiedade-em-equilibrio` retornou 200.
