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

### Ranking consistente no feed e tema da comunidade

O featured_badge legado de feed/detalhe usa votos isolados, portanto nao identifica
o Top 1/2/3 comunitario. Os cabecalhos consultam o endpoint existente top-mentors,
com periodo all, slug da comunidade e identidade do autor. TanStack Query compartilha
a consulta entre os cards da mesma comunidade por 60 segundos. Nunca herdar a
colocacao do autor do post para a resposta; autores fora do Top 3 mantem duas linhas.
Enquanto a consulta nao estiver disponivel, nao inventar ranking a partir dos votos.

Usar category cadastrada como tema curto, com nome completo como fallback. O title
informa a comunidade completa. Essa escolha evita deduzir temas cortando nomes.
Sem alteracao de API ou banco. Testes cobrem identidade da resposta, comunidade
sem ranking, carregamento e limite de tres posicoes.

### Atualizacao 2026-09-27: ranking textual no cabecalho

Posts e respostas usam MentorAuthorMeta para apresentar profissao e ranking
na segunda linha, com a data na terceira, somente para Top 1/2/3. Sem ranking,
o conteudo anterior permanece em duas linhas. Remover medalhas junto ao nome
em feed, comunidade, detalhe, perfil e salvos; preservar a medalha do avatar
comunitario. O texto pode quebrar em telas estreitas e preserva indicacao de edicao.

### Correcao 2026-09-27: roseta completa

Os SVGs anteriores incorporavam PNGs com a base removida. Ajustes de tamanho e
mascaras nao recuperavam os pixels perdidos. Substituir os tres arquivos por
geometria vetorial fechada, com margem no viewBox, gradientes metalicos e numeral
em path. Preservar transparencia e remover fitas e adornos internos. A recriacao
preserva o estilo metalico, mas nao e uma copia pixel a pixel da referencia.
Usar 12px na variante inline, como o verificado nas respostas, e versionar a URL
do asset para evitar reutilizacao dos arquivos recortados em cache.

- O selo fica mais consistente e premium em todas as superficies de posts/comentarios que exibem psicologos top mentors.
- A logica de ranking, dados, rotas, ordenacao e permissoes permanece inalterada.
- A animacao e leve, sem package novo, e respeita acessibilidade de movimento reduzido.

## Validacao

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local sem cookie autenticado em `/app/community/feed` retornou `307`, esperado para rota privada.
