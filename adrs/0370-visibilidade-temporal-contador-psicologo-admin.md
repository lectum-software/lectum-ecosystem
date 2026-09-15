# ADR-0370: Visibilidade temporal no contador principal do psicologo Admin

## Status

Accepted

## Task relacionada

TASK-106

## Contexto

O contador **Visibilidade** da aba `/psicologos/[id]?tab=estatisticas` no Admin exibiva uma contagem
derivada de visualizacoes de perfil e impressoes de busca. Esse numero nao tinha unidade temporal e
ficava desalinhado com a direcao de produto adotada para Visibilidade no Admin: tempo real de atencao
recebida, e nao score ou contagem abstrata.

Ja existem trackers first-party reais para duracao de pageviews, atencao em conteudo comunitario e
tempo assistido no video de apresentacao. Portanto, nao era necessario criar schema, seed, mock ou
endpoint paralelo.

## Decisao

O contador principal passa a ser **Visibilidade (tempo)** e usa `visibility_seconds` como unidade do
card e da serie temporal. O backend calcula essa metrica por dia no endpoint existente
`GET /api/admin/private/psychologists/:id/statistics`, combinando fontes reais:

- `page_view_event.duration_seconds` em perfil publico do psicologo, excluindo autovisitas quando o
  `user_id` do pageview e o proprio psicologo;
- `profile_video_watch_session.watched_seconds` do video de apresentacao;
- `content_attention_session.attention_seconds` em posts/respostas autorais de comunidade.

Para reduzir dupla contagem entre atencao de perfil e video de apresentacao no mesmo dia, a superficie
perfil/video usa o maior total diario entre perfil publico e video. A atencao em conteudo comunitario e
somada separadamente, pois acontece em outra superficie do produto. `profile_views` e `search_results`
continuam no DTO como sinais de suporte, mas deixam de definir o valor principal do contador
**Visibilidade (tempo)**.

## Consequencias

- O Admin passa a ler Visibilidade como duracao legivel (`65s`, `1min 05s`, `1h 02min`) e nao como
  contagem sem unidade clara.
- O grafico temporal passa a desenhar a evolucao de `visibility_seconds` para a linha de Visibilidade.
- Impressoes de busca nao viram tempo, porque essa fonte nao possui duracao real.
- Perfis sem sessoes temporais recentes podem mostrar `0s` ate acumularem novas visitas com duracao,
  video assistido ou atencao em conteudo comunitario.
- A decisao nao altera ranking, donuts ou matrizes do dashboard `/psicologos`.

## Validacao

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK; primeira execucao encerrou com exit 1 sem erro visivel, repeticao OK.
- `pnpm --dir admin build` - OK; primeira tentativa bloqueada por outro `next build` em andamento,
  repeticao OK apos aguardar finalizar.
- `pnpm check` - OK.
- Smoke backend real via `showAdminPsychologistStatistics` - OK, retornando `visibility_signal` com
  `unit="seconds"`, `label="Visibilidade (tempo)"` e pontos com `visibility_seconds`.
- Browser local headless em `localhost:3002` - OK para HTTP 200 e carregamento/redirect; sem sessao
  admin no perfil headless, a validacao autenticada do card foi limitada ao screenshot enviado pelo
  usuario e aos builds/checks locais.

## Pendencias

- Nenhuma pendencia externa. A coleta temporal depende apenas dos trackers ja existentes; nao ha
  backfill historico.
