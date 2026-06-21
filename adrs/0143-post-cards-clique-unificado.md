# ADR-0143: Clique unificado em cards de posts e respostas

Data: 2026-06-21

## Contexto

A Lectum exibia cards de posts e respostas em vários pontos da área autenticada: feed, comunidades, salvos, meus posts/respostas e publicações no perfil do psicólogo. O comportamento de clique não era totalmente uniforme: alguns cards só navegavam ao clicar no título/texto, alguns cards de respostas focavam o comentário correto, e ações internas precisavam continuar isoladas para não abrir o post por propagação de evento.

Builder/Quick Copy não ficou acessível neste ambiente; a implementação foi guiada pelos padrões já existentes no frontend e pelas telas locais em execução.

## Decisão

- Padronizar cards de post para abrir a página de detalhes ao clicar no corpo, área neutra, título ou conteúdo.
- Manter o nome da comunidade como link independente para a comunidade.
- Manter controles inferiores, botão Seguir, menus, modais, mídia, botões e links de autor como alvos interativos que não propagam navegação para o card.
- Usar o mesmo contrato de foco para cards de respostas/comentários: navegar para o post original com `focusReplyId` e hash `#reply-{id}`.
- Trocar o destaque fixo do comentário focado por uma animação de pulso azul temporária, com desaparecimento gradual e fallback para `prefers-reduced-motion`.

## Consequências

- A experiência fica previsível entre Feed, Comunidades, Meus posts e respostas, Perfil do psicólogo e Salvos.
- Cards de respostas em Salvos e Meus posts/respostas agora também preservam a regra de clique no nome da comunidade para abrir a comunidade, enquanto o restante do card foca a resposta no post original.
- O componente compartilhado `CommunityPostCard` passa a ter navegação por card habilitada por padrão, com opt-out via `openPostOnCardClick={false}` caso surja um uso futuro não navegável.
- Menus e modais renderizados dentro do DOM do card foram explicitamente tratados como áreas interativas para evitar navegação acidental ao confirmar/cancelar ações.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local em rotas representativas: `/app/community/feed`, `/app/posts/saved`, `/app/posts/mine`, `/app/community/ansiedade-em-equilibrio` e `/app/psychologist/cmqg35850000asuheq2ucwd0?tab=publicacoes`.


## Atualizacao 2026-06-21 - foco em respostas profundas

- O destino do deep link `?focusReplyId=<replyId>#reply-<replyId>` passa a carregar o caminho real de ancestrais da resposta focada quando ela estiver alem da profundidade inline padrao do detalhe do post.
- A tela do post renderiza essa trilha focada alem do limite visual apenas para permitir o foco, sem expandir a arvore completa nem alterar a paginacao de comentarios.
- O alvo focado tambem recebe foco DOM temporario (`tabindex="-1"` apenas durante o destaque), alem do pulso visual, melhorando acessibilidade para navegacao vinda de `Meus posts e respostas` e de `Salvos`.

## Validacao complementar 2026-06-21

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke API com `focusReplyId` profundo confirmou o alvo no payload de respostas.
- Chrome/CDP mobile 390x844 no detalhe do post confirmou elemento `reply-<id>` renderizado, focado, com `lectum-reply-focus-pulse` e scroll centralizado.

## Atualizacao 2026-06-21 - respostas no perfil do psicologo

- As publicacoes do perfil do psicologo que representam respostas (`contribution_type = reply`) passam a montar o mesmo deep link usado por Salvos e Meus posts/respostas: `?focusReplyId=<replyId>#reply-<replyId>`.
- A URL usa o id da `highlighted_professional_reply` retornada pelo contrato real do perfil, mantendo o post original como destino e a resposta como alvo focado.
- O compartilhamento de uma resposta do perfil tambem usa a URL focavel para preservar o contexto fora da navegacao interna.
- A decisao evita novo endpoint ou estado local especifico do perfil e reaproveita o carregamento de ancestrais ja centralizado no detalhe do post.

## Validacao complementar 2026-06-21 - perfil do psicologo

- `pnpm check`
- `pnpm --dir frontend build`
- Chrome/CDP mobile 390px em `/app/psychologist/cmqmg35850000asuheq2ucwd0?tab=publicacoes`, clicando em resposta profunda e confirmando URL com `focusReplyId`, alvo renderizado em viewport, foco DOM em `reply-cmqmlrlbk00067cuhl9sop6e2` e classe `lectum-reply-focus-pulse`.
