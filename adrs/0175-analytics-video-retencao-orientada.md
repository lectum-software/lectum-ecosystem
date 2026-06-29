# ADR-0175 - Analytics de video com leitura orientada para psicologos

## Status

Accepted em 2026-06-29.

## Task relacionada

TASK-20 - Analytics do psicologo.

## Contexto

A secao de video dos Analytics estava tecnicamente correta, mas alguns contadores criavam leitura negativa ou excessivamente tecnica para psicologos pouco familiarizados com marketing. A `Taxa de abandono`, por exemplo, podia mostrar 71% mesmo quando a retencao media e o ponto de maior queda indicavam bom desempenho. O bloco tambem tinha um insight isolado e generico, alem de um vazio visual no grid de contadores de negocio.

## Decisao

- Remover da UI os contadores frios `Taxa de abandono`, `Taxa de conclusao` e `Tempo medio assistido` na secao de video, preservando esses valores no contrato para calculo e auditoria.
- Manter como contadores de video apenas `Visualizacoes` e `Taxa de replays`.
- Agrupar retencao percentual e tempo medio em uma unica frase dentro do card de retencao: `Em media, os visitantes assistiram X% do video, cerca de mm:ss.`.
- Substituir o insight isolado por um diagnostico contextual dentro do card de retencao, com recomendacoes focadas em permanencia no video, sem misturar WhatsApp, conversao ou convite nesta area.
- Reordenar os contadores de negocio para que `Conversoes WhatsApp` ocupe um card largo de duas colunas ao final do bloco, removendo o espaco vazio deixado por `Favoritado` e destacando a metrica de maior valor comercial.

## Consequencias

- A tela comunica desempenho e proxima acao de forma mais humana para o publico profissional da Lectum.
- Evita que metricas simetricas ou negativas sejam interpretadas como problema quando o comportamento real do video e saudavel.
- Mantem o backend e o contrato sem quebra, permitindo futuras analises ou comparacoes sem nova migration.
- O card de WhatsApp ganha mais peso visual por representar intencao real de contato.
- A secao de retencao passa a orientar melhorias de abertura, ritmo, objetividade e duracao do video, enquanto conversao para WhatsApp permanece nos contadores de negocio e origem de trafego.

## Validacao

- `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `Invoke-WebRequest` em `/app/professional/analytics` retornando `307` para login sem sessao.

## Pendencias

- A calibragem dos limiares de diagnostico deve ser revista quando houver maior volume real de sessoes de video por perfil.
