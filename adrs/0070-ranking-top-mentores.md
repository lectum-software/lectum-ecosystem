# ADR-0070: Ranking derivado de Top Mentores da comunidade

## Status

Accepted

## Task relacionada

TASK-27

## Contexto

A TASK-27 estava bloqueada ate existir uma decisao explicita de pontuacao para o ranking de mentores. O ranking nao pode aceitar score do frontend, nao pode usar dados decorativos e deve ser derivado de eventos persistidos em `post_vote`, `community_post`, `post_reply`, `post_save` e do entitlement profissional ativo em `professional_subscription`.

Em 2026-06-13, o produto adicionou o PDF local `C:\Users\tulio\Desktop\Lectum\Sistema de Ranking de Mentores.pdf` como fonte externa da formula de ranking. Esta ADR substituiu a formula anterior `10/3/2` pela formula do PDF.

Em 2026-07-30, o produto decidiu recalibrar a formula para reduzir peso de votos simples, aumentar peso de relacionamento util, tratar resposta como cobertura de posts de pacientes e excluir acoes do proprio psicologo no proprio conteudo.

Em 2026-09-30, a analise de ranking real em comunidades mostrou que sinais passivos/invisiveis ainda podiam superar cobertura e volume de respostas em uma plataforma com base inicial pequena. O produto decidiu tornar a cobertura de perguntas de pacientes o componente principal, pontuar tambem a quantidade de respostas, adicionar bonus para video-respostas e reduzir o peso de compartilhamentos/WhatsApp/comentarios para que esses sinais complementem, mas nao dominem, a contribuicao visivel.

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

Formula vigente:

```text
score =
  (upvotes_received * 4)
  - (downvotes_received * 3)
  + (comments_received * 3)
  + (shares_received * 3)
  + (saves_received * 2)
  + (community_whatsapp_clicks * 3)
  + (posts_published * 1)
  + (replies_published * 3)
  + (reply_coverage_count * 10)
  + (video_replies_published * 4)
  + (active_days * 1)
  - removed_posts_penalty
```

A penalidade progressiva de posts removidos e calculada por comunidade com progressao aritmetica de 30 pontos por remocao concluida:

```text
removed_posts_penalty = 30 * removed_posts * (removed_posts + 1) / 2
```

Exemplos: 2 posts removidos = -90; 3 posts removidos = -180.

Definicoes de metricas persistidas nesta etapa:

- `upvotes_received`: linhas reais em `post_vote` com `value=1`, recebidas em posts ou respostas de autoria do mentor no periodo/filtro, excluindo voto do proprio mentor no proprio conteudo;
- `downvotes_received`: linhas reais em `post_vote` com `value=-1`, recebidas em posts ou respostas de autoria do mentor no periodo/filtro, excluindo voto do proprio mentor no proprio conteudo;
- `comments_received`: comentarios raiz recebidos em posts do mentor e respostas filhas recebidas em respostas do mentor, excluindo autocomentarios;
- `shares_received`: linhas reais em `post_share` para posts ou respostas do mentor no periodo/filtro, excluindo compartilhamento autenticado do proprio mentor no proprio conteudo;
- `saves_received`: linhas ativas em `post_save` para posts do mentor no periodo/filtro, excluindo salvamento do proprio mentor no proprio post;
- `posts_published`: posts reais em `community_post`, nao deletados e `status="publicado"`, feitos pelo mentor no periodo/filtro;
- `reply_coverage_count`: quantidade de posts de pacientes distintos que receberam ao menos uma resposta real do mentor no periodo/filtro; varias respostas do mesmo mentor no mesmo post contam como uma cobertura;
- `replies_published`: respostas reais em `post_reply`, nao deletadas, feitas pelo mentor em posts de pacientes no periodo/filtro; pontua diretamente para diferenciar quem contribui mais mesmo quando a cobertura e igual;
- `video_replies_published`: respostas reais em `post_reply`, nao deletadas, com `media_type="video"` e URL de midia valida, feitas pelo mentor em posts de pacientes no periodo/filtro; funciona como bonus de formato por resposta em video;
- `active_days`: dias distintos (data UTC do `createdAt`) com post publicado pelo mentor ou resposta do mentor em post de paciente na comunidade/periodo;
- `removed_posts`: posts do mentor com `status="removido"` na comunidade, usando `updatedAt` como aproximacao da data de remocao enquanto nao houver evento/auditoria especifica de moderacao.

Componentes ainda sem fonte persistida no schema atual:

- `community_whatsapp_clicks`: permanece 0 ate `contact_request` ou um evento equivalente registrar origem de comunidade com `community_id` e `post_id` ou `reply_id`, conforme o PDF.

Criterios de desempate:

1. maior `score`;
2. maior `reply_coverage_count`;
3. maior `video_replies_published`;
4. maior `replies_published`;
5. maior `upvotes_received`;
6. maior `comments_received`;
7. maior `shares_received`;
8. maior `saves_received`;
9. maior `community_whatsapp_clicks`;
10. maior `active_days`;
11. maior `posts_published`;
12. menor `downvotes_received`;
13. menor `removed_posts`;
14. nome do profissional em ordem alfabetica;
15. `id` como desempate estavel.

O endpoint retorna Top 5 por padrao, com limite tecnico maximo de 10. Apenas as posicoes 1, 2 e 3 devem receber selo publico fora da tela de ranking; a resposta continua retornando a posicao para todos os itens exibidos.

## Consequencias

- O frontend continua exibindo apenas dados derivados pelo backend e nao ordena localmente.
- A formula passa a refletir qualidade, participacao, engajamento positivo, cobertura de pacientes, penalidades e conversao, conforme a regra vigente do produto.
- Downvotes e posts removidos reduzem a pontuacao; um mentor com score negativo so entra se houver sinal real de ranking no periodo.
- A cobertura de respostas tem peso maior para favorecer psicologos que acolhem mais perguntas distintas de pacientes no periodo vigente.
- `replies_published` pontua diretamente, mas com peso menor que cobertura, para que duas respostas no mesmo post possam desempatar sem incentivar spam.
- Video-respostas ganham bonus proprio por serem o formato de maior valor para o produto e para a proposta do Plano Profissional.
- Upvotes recebidos ficam mais relevantes que antes, mas ainda dependem de publicacao real e nao substituem cobertura/contribuicao.
- Interacoes de autopromocao identificaveis do proprio psicologo no proprio conteudo nao inflam o score.
- Sinais invisiveis como WhatsApp e compartilhamentos continuam no score, mas com peso menor para nao superar contribuicao visivel quando a plataforma ainda tem baixo volume de pacientes.
- Selos publicos fora da tela de ranking nao podem mais ser inferidos por score local/faixa arbitraria; ate existir snapshot/consulta de ranking por comunidade, esses badges ficam nulos para evitar selo incorreto.
- `mentor_score_snapshot` ou tabela equivalente deve ser reavaliada quando os eventos ausentes forem persistidos ou quando o calculo em leitura ficar pesado.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `next start -p 3002`: `GET /app/community/top-mentors` retornou HTTP 200 com marcador da rota.
- Atualizacao 2026-07-30:
  - `pnpm --dir backend exec tsx -e ...` validou a formula pura com `reply_coverage_count` e sem peso para `replies_published`;
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir frontend check`;
  - `pnpm --dir admin check`;
  - `pnpm check`.
- Atualizacao 2026-09-30:
  - `pnpm --dir backend exec tsx --test src/modules/api/private/community/repositories/support/community-ranking.test.ts` validou cobertura, quantidade de respostas, bonus de video-resposta e pesos expostos pela formula;
  - `pnpm --dir backend typecheck`;
  - checks completos registrados na task/commit desta atualizacao.

## Pendencias

- Registrar cliques de WhatsApp originados da comunidade com `community_id`, `post_id` ou `reply_id` e `psychologist_id` antes de somar `community_whatsapp_clicks`.
- Reavaliar `mentor_score_snapshot` para atualizacao periodica quando houver volume real ou apos a modelagem completa dos eventos acima.
