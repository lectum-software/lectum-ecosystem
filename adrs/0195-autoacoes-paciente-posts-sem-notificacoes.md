# ADR-0195: Autoações de pacientes em posts próprios sem notificações

## Status

Accepted

## Task relacionada

Complemento da TASK-29B

## Contexto

Pacientes podem comentar, votar, salvar ou compartilhar o próprio post/comentário em comunidades,
inclusive quando o post está publicado como anônimo. Essas autoações não representam interação de
terceiros e não devem gerar ruído na central de notificações nem interrupções por push no
navegador.

A TASK-29B já centralizava eventos reais em `main/notification/domain-events.ts` e deduplicava por
origem, mas a regra de produto precisava ficar explícita nos produtores de conteúdo e também no
digest push de comunidades para pacientes, que escolhe posts recentes/engajados sem criar
`notification` in-app.

## Decisão

- Autoação autenticada em posts/comentários é definida como `actorId` igual ao `author_id` do
  `community_post` ou `post_reply` alvo.
- `nova_resposta`, `upvote`, `salvamento` e `compartilhamento` retornam antes do dispatcher quando
  a ação autenticada é do próprio autor do alvo.
- A comparação usa apenas ids internos; eventos passivos continuam sem expor ator na central.
- O `community_evening_digest` para pacientes exclui posts cujo `author_id` seja o próprio
  destinatário do digest, evitando push de navegador baseado em engajamento do próprio post.
- Visitantes/ações sem autenticação continuam tratados pelo fluxo existente; sem identidade segura,
  não há como associar a ação ao autor.

## Consequências

- A central `/app/notifications`, eventos realtime e push imediato deixam de receber ruído de
  autoações autenticadas em posts próprios.
- O digest de comunidades para pacientes passa a sugerir conteúdo de terceiros, não o próprio post
  do destinatário.
- Não houve mudança de schema, migrations, contratos públicos, endpoints, preferências ou packages.
- Ações reais de outros usuários seguem gerando notificações conforme preferências e silenciamento
  do post.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Pendências

- Nenhuma.
