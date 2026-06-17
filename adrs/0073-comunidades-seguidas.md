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
