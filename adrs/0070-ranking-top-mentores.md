# ADR-0070: Ranking derivado de Top Mentores da comunidade

## Status

Accepted

## Task relacionada

TASK-27

## Contexto

A TASK-27 estava bloqueada ate existir uma decisao explicita de pontuacao para o ranking de mentores. O ranking nao pode aceitar score do frontend, nao pode usar dados decorativos e deve ser derivado de eventos persistidos em `post_vote`, `community_post`, `post_reply`, `post_save` e do entitlement profissional ativo em `professional_subscription`.

Em 2026-06-13, o produto adicionou o PDF local `C:\Users\tulio\Desktop\Lectum\Sistema de Ranking de Mentores.pdf` como fonte externa da formula de ranking. Esta ADR substitui a formula anterior `10/3/2` pela formula do PDF.

## Decisao

O ranking de mentores continua derivado no backend e nao aceita pontuacao enviada pelo frontend. Nesta etapa, o calculo permanece em tempo de leitura, sem materializar `mentor_score_snapshot`; a materializacao periodica fica preparada como evolucao quando a fonte de eventos de compartilhamento/WhatsApp por comunidade e a pressao real de performance justificarem a migracao.

Elegibilidade:

- usuario com `role="psicologo"`, ativo e nao deletado;
- `psychologist_profile.deleted=false`;
- `psychologist_profile.published=true`;
- `psychologist_profile.cfp_verified_at` preenchido;
- ao menos uma `professional_subscription` ativa em plano nao gratuito, usando `activeProfessionalEntitlementWhere()`.

Periodos aceitos:

- `30d` (padrao): ultimos 30 dias;
- `90d`: ultimos 90 dias;
- `all`: historico completo.

Filtro opcional:

- `community=<slug>` restringe votos, posts, respostas, comentarios recebidos, salvamentos e penalidades a comunidade informada.

Formula aprovada pelo PDF:

```text
score =
  (upvotes_received * 5)
  - (downvotes_received * 3)
  + (comments_received * 2)
  + (shares_received * 4)
  + (saves_received * 3)
  + (community_whatsapp_clicks * 6)
  + (posts_published * 1)
  + (replies_published * 1)
  + (active_days * 1)
  - removed_posts_penalty
```

A penalidade progressiva de posts removidos e calculada por comunidade com progressao aritmetica de 30 pontos por remocao concluida:

```text
removed_posts_penalty = 30 * removed_posts * (removed_posts + 1) / 2
```

Exemplos: 2 posts removidos = -90; 3 posts removidos = -180.

Definicoes de metricas persistidas nesta etapa:

- `upvotes_received`: linhas reais em `post_vote` com `value=1`, recebidas em posts ou respostas de autoria do mentor no periodo/filtro;
- `downvotes_received`: linhas reais em `post_vote` com `value=-1`, recebidas em posts ou respostas de autoria do mentor no periodo/filtro;
- `comments_received`: comentarios raiz recebidos em posts do mentor e respostas filhas recebidas em respostas do mentor, excluindo autocomentarios;
- `saves_received`: linhas ativas em `post_save` para posts do mentor no periodo/filtro;
- `posts_published`: posts reais em `community_post`, nao deletados e `status="publicado"`, feitos pelo mentor no periodo/filtro;
- `replies_published`: respostas reais em `post_reply`, nao deletadas, feitas pelo mentor no periodo/filtro;
- `active_days`: dias distintos (data UTC do `createdAt`) com post ou resposta publicada pelo mentor na comunidade/periodo;
- `removed_posts`: posts do mentor com `status="removido"` na comunidade, usando `updatedAt` como aproximacao da data de remocao enquanto nao houver evento/auditoria especifica de moderacao.

Componentes ainda sem fonte persistida no schema atual:

- `shares_received`: permanece 0 ate existir evento persistido de compartilhamento de post/resposta por comunidade;
- `community_whatsapp_clicks`: permanece 0 ate `contact_request` ou um evento equivalente registrar origem de comunidade com `community_id` e `post_id` ou `reply_id`, conforme o PDF.

Criterios de desempate:

1. maior `score`;
2. maior `upvotes_received`;
3. maior `comments_received`;
4. maior `community_whatsapp_clicks`;
5. maior `saves_received`;
6. maior `active_days`;
7. maior `replies_published`;
8. maior `posts_published`;
9. menor `downvotes_received`;
10. menor `removed_posts`;
11. nome do profissional em ordem alfabetica;
12. `id` como desempate estavel.

O endpoint retorna Top 5 por padrao, com limite tecnico maximo de 10. Apenas as posicoes 1, 2 e 3 devem receber selo publico fora da tela de ranking; a resposta continua retornando a posicao para todos os itens exibidos.

## Consequencias

- O frontend continua exibindo apenas dados derivados pelo backend e nao ordena localmente.
- A formula passa a refletir qualidade, participacao, engajamento positivo, penalidades e conversao, conforme o PDF.
- Downvotes e posts removidos reduzem a pontuacao; um mentor com score negativo so entra se houver sinal real de ranking no periodo.
- Compartilhamentos e cliques WhatsApp de comunidade nao sao simulados: sem evento persistido, ficam zerados e documentados como pendencia real.
- Selos publicos fora da tela de ranking nao podem mais ser inferidos por score local/faixa arbitraria; ate existir snapshot/consulta de ranking por comunidade, esses badges ficam nulos para evitar selo incorreto.
- `mentor_score_snapshot` ou tabela equivalente deve ser reavaliada quando os eventos ausentes forem persistidos ou quando o calculo em leitura ficar pesado.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `next start -p 3002`: `GET /app/community/top-mentors` retornou HTTP 200 com marcador da rota.

## Pendencias

- Criar fonte persistida para compartilhamentos por conteudo/comunidade antes de somar `shares_received`.
- Registrar cliques de WhatsApp originados da comunidade com `community_id`, `post_id` ou `reply_id` e `psychologist_id` antes de somar `community_whatsapp_clicks`.
- Reavaliar `mentor_score_snapshot` para atualizacao periodica quando houver volume real ou apos a modelagem completa dos eventos acima.
