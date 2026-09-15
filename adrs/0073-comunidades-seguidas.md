# ADR-0073: Tela de comunidades seguidas

## Status

Accepted

## Contexto

O menu do usuário já exibia a opção "Comunidades seguidas", mas ela não abria uma tela dedicada.
A participação em comunidades já era persistida por `community_member` desde a TASK-25. O usuário
forneceu o PDF local `C:\Users\tulio\Downloads\Seguindo.pdf` como referência visual para a tela
"Seguindo".

## Decisão

- Reaproveitar a rota existente `/app/following`, substituindo o redirecionamento para
  `/app/community` por uma tela mobile-first de comunidades seguidas.
- Vincular a opção "Comunidades seguidas" no Perfil à rota `/app/following`.
- Estender `GET /api/private/community` com o query param `scope=following`, sem criar novo schema
  Prisma e sem endpoint paralelo.
- Retornar metadados opcionais de lista em comunidades: `following`, `membership_created_at`,
  `posts_count` e `new_posts_count`.
- Retornar estatísticas opcionais de listagem: `following_count` e `new_posts_today_count`, usadas
  no card "Minha atividade".
- Manter recomendações baseadas apenas em comunidades reais já retornadas pelo backend; a ação
  "Participar" usa `POST /api/private/community/:slug/members`.
- Como `community` ainda não possui imagem/capa persistida, a tela usa identidade visual derivada
  do nome/slug, sem dados fake e sem inventar coluna de mídia.

## Consequências

- Usuários autenticados conseguem ver uma lista real das comunidades que seguem.
- O filtro `scope=following` passa a atender tanto o feed quanto a tela dedicada de "Seguindo".
- A tela segue o layout do PDF em estrutura: cabeçalho, card de atividade, destaque, minhas
  comunidades e recomendações horizontais.
- Capas/imagens reais por comunidade permanecem pendentes de modelagem futura, caso o produto
  decida persistir esses assets.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local: `GET http://127.0.0.1:3000/app/following` retornou 200.
- Smoke API sem sessão: `GET http://127.0.0.1:3001/api/private/community?scope=following`
  retornou 401, confirmando proteção por autenticação privada.

## Complemento 2026-06-17: reducao de ruido visual

### Contexto

A tela `/app/following` ja cumpria a funcao de listar comunidades seguidas e recomendacoes, mas o card
`Em destaque` exibia uma descricao curta e a secao final `Acompanhe novidades` repetia mensagens
informativas de baixo valor para a jornada atual.

### Decisao

- Remover a descricao do card `Em destaque`, preservando apenas badge de estado, nome da comunidade
e CTA `Explorar`.
- Compactar a altura do card de destaque para que a ausencia da descricao nao gere area vazia.
- Remover a secao `Acompanhe novidades` e seus chips informativos.
- Manter dados, consultas, recomendacoes e participacao em comunidades inalterados.

### Consequencias

- A pagina fica mais densa e focada nas comunidades seguidas, destaque e recomendacoes.
- A decisao e estritamente visual: nenhum contrato de API, schema Prisma, endpoint ou regra de
participacao foi alterado.

## Complemento 2026-08-15: imagens reais/catalogadas na tela

### Contexto

Depois da atualizacao do catalogo visual das comunidades, a tela `/app/following` continuava usando
um destaque puramente em CSS e avatares gradientes com iniciais. Na rota canonica
`/app/comunidades-seguidas`, isso fazia o bloco **Em destaque** parecer uma imagem borrada/generica
e as demais comunidades perderem os assets reais ja disponiveis.

### Decisao

- Reutilizar `buildCommunityExploreCard`, a mesma fonte visual usada em `/comunidades`, para resolver
  a imagem da comunidade em Comunidades seguidas.
- Renderizar a imagem do destaque com `next/image` como background do card, mantendo overlay escuro
  para contraste de texto e CTA.
- Renderizar os avatars de **Minhas comunidades** e **Recomendados para voce** com `next/image`,
  preservando iniciais apenas como fallback atras da imagem.
- Nao alterar `GET /api/private/community`, `community_member`, contratos, schema Prisma, packages
  ou dados persistidos.

### Consequencias

- A tela passa a refletir a identidade visual real/catalogada das comunidades em todos os blocos.
- O comportamento de seguir, recomendacoes, contadores e novidades permanece inalterado.
- A decisao substitui a premissa antiga de que a tela precisava usar apenas identidade derivada por
  nome/slug; os assets agora existem no catalogo visual vigente.

## Complemento 2026-08-16: descricao no card de destaque

### Contexto

Com as imagens reais/catalogadas ja aplicadas em `/app/comunidades-seguidas`, o card **Em destaque**
passou a ter espaco visual suficiente para retomar uma descricao curta abaixo do titulo. O produto
solicitou explicitamente esse texto no destaque, sem alterar os demais cards nem a navegacao.

### Decisao

- Reintroduzir uma descricao somente no card **Em destaque** da tela de comunidades seguidas.
- Priorizar `community.description` quando o backend fornecer conteudo real e usar a descricao
  catalogada por `buildCommunityExploreCard` para comunidades conhecidas.
- Nao exibir fallback generico no destaque quando nao houver descricao real ou catalogada com valor
  editorial.
- Ajustar a altura minima do card de forma mobile-first para preservar legibilidade sobre a imagem e
  manter badge, titulo, descricao e CTA no mesmo bloco.
- Nao alterar contrato de API, schema Prisma, endpoints, packages ou regras de participacao.

### Consequencias

- A tela ganha contexto textual no destaque sem criar dados artificiais persistentes.
- Comunidades sem descricao continuam sem texto generico no destaque, evitando copy de baixo valor.
- O ajuste revisa a decisao visual de 2026-06-17 apenas para o estado atual com assets reais no
  destaque; as demais secoes permanecem compactas.

### Validacao

- `pnpm --dir frontend exec biome check --write src/app/app/following/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start`: `/version` 200, `/app/comunidades-seguidas` 307 para login sem sessao
  e `/app/following` 308 para a rota canonica.
- `pnpm check`
