# ADR-0376: Posição média real do vídeo no Explorar no Admin

## Status

Accepted

## Task relacionada

TASK-112

## Contexto

O Admin precisa entender não apenas quantas impressões o vídeo/card do psicólogo recebeu no Explorar, mas também em que
posição média ele foi exibido e se essa posição melhorou ou piorou frente ao período anterior. O modelo existente
`profile_view_event` já registra impressões de `source="search_result"`, mas não armazenava a posição do resultado.

## Decisão

- Persistir a posição absoluta do card/vídeo no Explorar em `profile_view_event.search_result_position`, campo nullable.
- Gravar esse campo somente em novas impressões reais `source="search_result"` enviadas pelo frontend público.
- Calcular `video.explore_position` na API Admin como média das posições reais preenchidas no período.
- Não fazer backfill de eventos antigos sem posição.
- Inverter a semântica de tendência para posição: número menor significa melhora (`trend="up"`/subiu) e número maior
  significa piora (`trend="down"`/desceu).

## Consequências

- A métrica é auditável e baseada em eventos first-party reais.
- Perfis sem impressões novas com posição confiável exibem **Sem base**, evitando estimativa falsa.
- A comparação usa o contrato de comparação existente, mas a UI de posição interpreta a diferença absoluta em posições.
- Há aumento pequeno de armazenamento em `profile_view_event` e um novo índice para consultas por psicólogo, origem e data.

## Validação

- `pnpm --dir backend exec prisma format`.
- `pnpm --dir backend db:migrate --name add-search-result-position` — sem erro; banco já estava sincronizado.
- `pnpm --dir backend exec prisma migrate status`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- HTTP local em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou 200 após `pnpm --dir admin dev`.

## Pendências

- Nenhuma decisão externa pendente.
