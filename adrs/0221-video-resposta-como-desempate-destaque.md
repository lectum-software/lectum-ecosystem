# ADR-0221: Vídeo-resposta como desempate da resposta profissional em destaque

## Status

Accepted

## Task relacionada

Pedido direto de produto em 2026-07-07.

## Contexto

O feed já renderiza mídia real de `highlighted_professional_reply` quando o backend seleciona uma resposta com `media_url` e `media_type="video"`. No post de exemplo de TDAH havia uma vídeo-resposta profissional persistida, mas ela não aparecia na resposta em destaque porque outras respostas do mesmo psicólogo tinham o mesmo placar e venciam pelo desempate de recência.

## Decisão

Manter a regra principal de destaque por escore de votos e, quando existir ranking de mentor, por posição do mentor. Em empate desses critérios, priorizar respostas profissionais com vídeo real antes do desempate por recência/id.

A decisão foi aplicada nas seleções de destaque do feed/comunidade, listas de posts e publicações do perfil profissional para evitar divergência entre superfícies que usam `highlighted_professional_reply`.

## Consequências

- Vídeo-respostas empatadas em relevância passam a aparecer no card de destaque, aproveitando o player já existente.
- O escore por votos e a elegibilidade de psicólogo verificado continuam sendo os critérios dominantes.
- Em empates entre respostas igualmente relevantes do mesmo mentor, a recência deixa de vencer uma resposta com vídeo.

## Validação

- `pnpm --dir backend check`
- `GET http://localhost:3001/api/private/community/feed/posts?community=tdah&limit=5` retornou a resposta destacada `cmrb6g7cc003vy0uhs3yl40ed` com `media_type="video"` e `media_url` preenchida.
- `HEAD https://verbose-trapeze-clapping.ngrok-free.dev/public/files/posts/media/lectum-demo-2026-07-07-tdah.mp4` retornou `200` com `video/mp4`.
- Chrome headless mobile-first `390x844` em `http://localhost:3000/?community=tdah` confirmou o player de vídeo dentro da resposta profissional destacada.

## Pendências

- Nenhuma pendência externa.
