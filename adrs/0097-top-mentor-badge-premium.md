# ADR-0097: Badge TOP Mentor premium em respostas e comentarios

## Status

Aceito - 2026-06-15

## Contexto

O badge `TOP #1 Mentor` exibido em autores psicologos e respostas profissionais estava visualmente leve demais, parecendo uma label comum em vez de um selo de ranking. O ajuste precisava melhorar autoridade visual sem alterar ranking, dados, ordenacao, posicao do badge ou estrutura dos cards.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao. As referencias auditaveis para o contexto de comunidade permanecem `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`, complementadas pelo pedido detalhado do usuario.

## Decisao

- Centralizar a renderizacao do badge em `frontend/src/components/community/mentor-badge.tsx`, reutilizando o mesmo componente no feed, na pagina interna de comunidade e no detalhe do post.
- Manter a string recebida da API como conteudo, aplicando apenas transformacao visual `uppercase` via CSS.
- Criar variacoes visuais por posicao: ouro para `#1`, prata para `#2` e bronze para `#3`.
- Usar tipografia compacta com `font-weight: 800`, letter-spacing sutil e superficie/pill muito leve para dar leitura de selo sem pesar o layout.
- Implementar brilho horizontal por CSS em `globals.css`, com pseudo-elemento e `prefers-reduced-motion` para desativar a animacao quando o usuario preferir reduzir movimento.

## Consequencias

- O selo fica mais consistente e premium em todas as superficies de posts/comentarios que exibem psicologos top mentors.
- A logica de ranking, dados, rotas, ordenacao e permissoes permanece inalterada.
- A animacao e leve, sem package novo, e respeita acessibilidade de movimento reduzido.

## Validacao

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local sem cookie autenticado em `/app/community/feed` retornou `307`, esperado para rota privada.
