# ADR-0064: Feed da Comunidade agregado com prévia profissional real

## Status

Accepted

## Task relacionada

TASK-23, refinamentos solicitados em 2026-06-12 e 2026-06-13.

## Contexto

A tela de comunidade não representa o detalhe de uma comunidade específica. A regra vigente é que o destino principal da nav bar "Comunidade" seja o **Feed da Comunidade**: um feed vertical global, estilo Reddit adaptado para Lectum, com posts de destaque misturados de todas as comunidades e sem arrays locais/mocks para preencher a UI.

As páginas de detalhe por comunidade serão criadas depois. Até lá, chips e nomes de comunidade apontam para as rotas futuras `/app/community/[slug]`, enquanto a implementação atual usa essa rota como compatibilidade/filtro do feed.

## Decisão

- Usar `/app/community/feed` como rota canônica do Feed da Comunidade e manter `/app/community` como explorar/listar comunidades.
- Manter a opção de governança `Solicitar nova comunidade` via `community_suggestion`; usuários finais não criam comunidades diretamente.
- Registrar que criação/curadoria/moderação de comunidades pertence a administradores da plataforma; mentores não moderam e não ganham permissões por selo.
- Centralizar chips em `frontend/src/utils/community.ts` e apontar os chips de comunidade para `/app/community/[slug]`, preparando o detalhe futuro.
- Refatorar cards para a ordem: comunidade, autor, tempo, título, texto, prévia profissional quando existir, ações.
- Criar a tabela `post_replies` conforme o modelo previsto em `DATA-MODEL.md`, com `post_id`, `author_id`, `parent_reply_id`, `content` e `upvotes_count`.
- Estender `GET /api/private/community/feed/posts` e `GET /api/private/community/:slug/posts` com `highlighted_professional_reply`.
- Selecionar `highlighted_professional_reply` apenas entre respostas de autores `role="psicologo"` com `psychologist_profile.cfp_verified_at` preenchido, ordenando por maior `upvotes_count`.
- Ignorar comentários de usuários comuns e respostas de psicólogos sem verificação CFP para a prévia profissional.
- Exibir `Chamar no WhatsApp` somente dentro da prévia profissional quando o psicólogo é verificado e tem entitlement profissional pago ativo; psicólogos verificados gratuitos não recebem o CTA no feed.
- Manter `TOP MENTOR`/`TOP #1 MENTOR` como destaque visual, sem permissão especial. A UI suporta três posições premium: `TOP #1 MENTOR` (ouro), `TOP #2 MENTOR` (prata) e `TOP #3 MENTOR` (bronze), sempre acima do nome do psicólogo.
- Manter upvote/downvote, comentários, salvar e compartilhar nas ações do card.
- Simplificar o botão de filtro para exibir apenas o ícone cinza e remover textos auxiliares do menu, mantendo só `Todas as comunidades` e `Comunidades que sigo`.
- Adicionar ícone de descoberta no chip `Explorar`.
- Persistir `community_post.anonymous` para diferenciar posts de pacientes anônimos e identificados; o default `true` preserva privacidade de dados já existentes.
- Usar avatar com ícone anônimo inspirado em `C:\Users\tulio\Downloads\Membro Anônimo.png` quando `anonymous=true`.
- Exibir posts anônimos de pacientes como `Membro Anônimo #1234`, com sufixo numérico determinístico derivado do `community_post.id`; o nome mascarado não representa perfil público e não deve ser clicável.
- Respeitar o anonimato também na busca por nome: posts anônimos de pacientes não devem ser encontrados pelo nome real do autor.
- Esconder o header de busca/chips ao rolar para baixo e reexibir ao rolar para cima com transição suave.
- Reposicionar metadados de posts de pacientes para mostrar somente o tempo abaixo do nome.
- Refinar cores dos selos para ouro/champagne/cobre sofisticados e remover shadow/drop-shadow.
- Atualizar os selos `TOP #1`, `TOP #2` e `TOP #3 MENTOR` para os gradientes exatos do Figma: `#CE953A→#EFEF7B→#9C7924`, `#CBD5E1→#F1F5F9→#94A3B8` e `#A8703A→#E6BE8A→#CD7F32→#8B4513`, com texto/ícone `#1F2937` para #1 e `#0F172A` para #2/#3.
- No Feed da Comunidade, substituir o item central `Comunidade` da navegação inferior por um CTA circular azul com ícone `+`, sem label visível, apontando para `/app/community/feed/post/new`.
- Ajustar apenas o CTA central para reproduzir o mockup anexado: dimensão visual 56px com borda branca dentro do próprio botão, `+` proporcional e avanço parcial sobre a borda superior, sem alterar altura, padding, margens ou estrutura da navbar.
- Manter os demais itens da navegação inferior (`Psicólogos`, `Favoritos`, `Notificações`, `Perfil`) e preservar a navegação lateral desktop padrão.
- Adicionar no desktop um CTA flutuante azul com ícone `+` no canto inferior direito da área de conteúdo do Feed da Comunidade, apontando para `/app/community/feed/post/new`; no mobile, manter apenas o botão central da bottom navigation.
- Manter o botão `Seguir` visualmente vinculado à comunidade no cabeçalho do card: a linha `Postado em [comunidade] [Seguir]` usa flex, trunca nomes longos com ellipsis e impede o botão de ser empurrado para fora do card.
- Enquanto `community_member` não estiver implementado (TASK-25), `scope=following` retorna estado vazio honesto.

## Consequências

- O feed global passa a estar preparado para destacar respostas profissionais reais sem inventar placeholder.
- O schema de comentários/respostas foi antecipado para atender a prévia profissional do feed, mas criação/listagem detalhada de comentários segue em tasks futuras.
- O CTA de WhatsApp fica alinhado ao modelo de negócio: só aparece quando a resposta destacada é de psicólogo verificado e pago.
- O ranking visual de mentor é derivado por faixas de engajamento até existir o ranking definitivo, sem criar permissões ou poderes de moderação.
- A navegação para comunidade está preparada para detalhe futuro, mesmo que hoje ainda sirva como filtro/compatibilidade.
- A criação real de posts foi implementada posteriormente na TASK-24/ADR-0065; este ADR permanece como decisão do feed e do CTA de entrada.

## Validação

- `pnpm --dir backend db:migrate --name add_post_replies`: sucesso.
- `pnpm --dir backend db:migrate --name add_community_post_anonymous`: sucesso.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Refinamento da navegação inferior: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`: sucesso.
- Refinamento de proporção do botão central conforme mockup, preservando a navbar: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`: sucesso.
- Refinamento dos gradientes de TOP MENTOR conforme Figma: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`: sucesso.
- Refinamento do CTA desktop de criação de post: `pnpm --dir frontend check` e `pnpm --dir frontend build`: sucesso.
- Refinamento do alinhamento `Postado em [comunidade] [Seguir]`: `pnpm --dir frontend check` e `pnpm --dir frontend build`: sucesso.
- Refinamento de anonimato numerado no feed: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build` e `pnpm check`: sucesso.
- Validação HTTP local do Feed da Comunidade após CTA desktop: `GET http://localhost:3000/app/community/feed` retornou `200`.
- Validação HTTP local após anonimato numerado: `GET http://localhost:3000/app/community/feed` retornou `200`.
- Validação visual/HTTP local em `http://localhost:3000/app/community/feed`: sucesso (`200`).
- Validação local de API com token temporário:
  - `GET /api/private/community/feed/posts?page=1&limit=12` retornou `200` com posts persistidos, campo `highlighted_professional_reply` no contrato e badges `TOP #1 MENTOR`, `TOP #2 MENTOR`, `TOP #3 MENTOR` quando aplicável;
  - `GET /api/private/community/feed/posts?page=1&limit=5&scope=following` retornou `200`, `count=0`.
- Validação HTTP local de rotas:
  - `GET http://localhost:3000/app/community/feed` retornou `200`;
  - `GET http://localhost:3000/app/community/post/new` retornou `200` como destino preparado para o CTA central `+`;
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou `200` como compatibilidade/filtro até o detalhe futuro.

## Pendências

- Implementar respostas/comentários detalhados com regras de moderação (TASK-26); a criação de posts de texto foi concluída na TASK-24/ADR-0065.
- Implementar `community_member`/seguir comunidades para popular o filtro `following` (TASK-25).
- Criar páginas de detalhe de comunidade e post.
- Implementar votos, salvamentos e compartilhamentos persistidos quando suas tasks entrarem em execução.
- Criar schema persistido para mídia de posts quando anexos/vídeos de comunidade entrarem no escopo.


## Atualizacao 2026-06-20 - header sem quebra e rolagem infinita

### Contexto

No mobile, cards do feed podiam quebrar a linha do botao `Seguir` ou do menu `...` quando o nome da comunidade era longo. A paginacao visivel `Anterior / Proxima` tambem interrompia a leitura do feed e da pagina interna de comunidade, apesar do comportamento esperado ser de rede social com carregamento progressivo.

### Decisao

- A linha de contexto dos cards passa a ser uma unica linha flex sem quebra: `Postado em`, nome da comunidade, `Seguir` e `...` permanecem alinhados.
- Quando faltar espaco, apenas o nome da comunidade trunca com ellipsis, preservando botoes e menus como elementos `shrink-0`.
- O feed global e a pagina interna de comunidade deixam de renderizar controles manuais de paginacao.
- As leituras continuam usando os endpoints paginados reais (`page`/`limit`), mas o frontend passa a carregar a proxima pagina com `useInfiniteQuery` e `IntersectionObserver` ao aproximar o usuario do fim da lista.
- O card compartilhado de publicacoes tambem recebe o mesmo tratamento de header sem quebra para manter consistencia em Salvos, Meus posts e perfil.

### Consequencias

- Nao ha alteracao de backend, Prisma, contrato HTTP, ordenacao, filtros, votos, salvos ou ranking.
- A experiencia de leitura fica mais fluida e nao mostra paginacao visual ao usuario final.
- O comportamento preserva dados reais e apenas compoe multiplas paginas retornadas pela API existente.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validacao HTTP local das rotas `/app/community/feed` e `/app/community/autocuidado-em-pratica`.


## Atualizacao 2026-06-20 - acoes do card de feed

### Contexto

O botao `Seguir` nos cards do feed precisava permanecer junto ao nome da comunidade, dentro da linha `Postado em [Comunidade]`, e o menu `...` nao deveria aparecer nos cards de lista.

### Decisao

- O botao `Seguir` foi movido para o mesmo grupo flex do nome da comunidade.
- Quando falta espaco, somente o nome da comunidade trunca com ellipsis; `Seguir` permanece visivel e adjacente ao contexto da comunidade.
- O menu `...` foi removido dos cards de feed/lista; as acoes de dono do post ficam restritas a pagina interna do post.
- Os cards do feed e da pagina de comunidade passam a navegar para o detalhe do post quando o clique ocorre em areas neutras do card.
- Elementos interativos mantem comportamento proprio e nao disparam navegacao do card: links, botoes, inputs, midias interativas e menus.

### Consequencias

- O cabecalho do card fica menos disperso e mais previsivel no mobile.
- Acoes destrutivas ou de silenciar continuam acessiveis no contexto de detalhe do post, evitando menus redundantes nas listas.
- O corpo do card fica mais facil de abrir sem transformar controles como `Seguir`, votos, comentarios, salvar e compartilhar em gatilhos redundantes.
- Nao ha alteracao em backend, Prisma, contratos HTTP, filtros, ordenacao ou persistencia.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validacao HTTP local das rotas `/app/community/feed`, `/app/community/autocuidado-em-pratica` e de uma pagina interna de post.
