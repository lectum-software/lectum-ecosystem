# ADR-0224: Exemplos locais com vídeo-respostas diretas em posts de pacientes

## Status

Accepted

## Task relacionada

Complemento operacional da TASK-42 por pedido direto de produto em 2026-07-07.

## Contexto

Depois da ADR-0223, a prévia automática `highlighted_professional_reply` passou a considerar somente respostas profissionais diretas ao post. Os posts demonstrativos de pacientes criados anteriormente tinham vídeo-respostas reais de psicólogo, mas elas estavam vinculadas a comentários de usuários. Com a nova regra, esses vídeos deixaram corretamente de aparecer como destaque do card.

Para exemplificar a experiência desejada no feed, o usuário pediu que vídeo-respostas de psicólogos aparecessem em destaque nos posts de pacientes.

## Decisão

Atualizar os registros demonstrativos locais existentes para que as vídeo-respostas profissionais sejam respostas diretas ao post (`parent_reply_id = null`) nos cinco posts de exemplo de pacientes:

- ansiedade;
- autocuidado;
- depressão;
- relacionamentos;
- TDAH.

Foram reaproveitados os registros e URLs de mídia já persistidos no banco de desenvolvimento. Não foram criados mocks, endpoints paralelos, arquivos de seed, schema ou migrations.

## Consequências

- Os cards dos posts demonstrativos de pacientes voltam a exibir vídeo-resposta profissional em destaque, agora coerente com a regra de domínio.
- As respostas encadeadas continuam existindo no detalhe/thread, mas o vídeo em destaque passa a representar uma resposta direta ao post original.
- Por ser uma atualização operacional do banco de desenvolvimento atual, a mudança não cria dados permanentes de produto em código.

## Validação

- `GET http://localhost:3001/api/private/community/feed/posts?limit=30` retornou os cinco posts `[Exemplo Lectum]` com `highlighted_professional_reply.media_type="video"` e `highlighted_professional_reply.parent_reply_id=null`.
- `pnpm --dir backend check`
- `pnpm check`
- `git diff --check`
