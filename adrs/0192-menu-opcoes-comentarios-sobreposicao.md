# ADR-0192: Menu de opcoes dos comentarios acima do composer fixo

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

No detalhe publico do post, os comentarios usam uma barra de acoes compacta com um menu de tres pontinhos para salvar, compartilhar, denunciar e, quando aplicavel, editar/excluir. Esse menu era absoluto e abria para baixo a partir da barra de acoes. Em telas mobile-first (~390px), a barra de acoes pode ficar proxima do rodape e do composer fixo; por isso o menu ficava parcialmente fora do viewport ou atras da camada do composer.

A correcao precisava preservar a arquitetura atual, sem criar novo componente de dropdown, sem instalar pacote e sem alterar contratos de API ou persistencia.

## Decisao

- O menu inline de comentarios em `frontend/src/app/app/community/[slug]/post/[id]/logic.tsx` passa a abrir para cima (`bottom-8`) e usa `z-[120]`, acima do composer fixo (`z-40`).
- O menu de acoes do proprio comentario em `frontend/src/components/community/reply-owner-action-menu.tsx` mantem a direcao padrao para baixo nos cards de `Meus posts/comentarios`, mas tambem sobe para `z-[120]` para nao ficar atras de barras fixas ou overlays leves.
- A solucao continua CSS/Tailwind local, reutilizando os menus existentes e sem dependencia nova.

## Consequencias

- O menu de comentarios deixa de abrir para fora da area util quando a acao esta perto do rodape.
- No mobile, o menu fica acima da camada do composer, entao nao e ocultado pela caixa de resposta fixa.
- O menu pode sobrepor temporariamente a area do composer enquanto esta aberto, o que e aceitavel porque o foco do usuario esta nas opcoes do menu.
- Se futuramente houver mais menus com posicionamento contextual complexo, avaliar um componente compartilhado com calculo de colisao/portal; isso nao foi necessario para a correcao pontual.

## Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx" "src/components/community/reply-owner-action-menu.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `200` em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v`.
- Chrome/CDP local em viewport mobile 390x844: menu de resposta encontrado, abriu para cima, ficou dentro do viewport e renderizou com `z-index: 120` acima do composer fixo com `z-index: 40`.

## Pendencias

- Nenhuma.
