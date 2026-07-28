# ADR-0341: Vocabulário Demanda no Admin de psicólogos

Status: Accepted
Data: 2026-07-28

## Contexto

O produto pediu padronizar a leitura administrativa de resultado de negócio dos psicólogos como **Demanda** em todos os pontos visíveis e, quando aplicável, também nos contratos e identificadores internos.

Essa leitura continua sendo operacional e privada do Admin, derivada de sinais reais de WhatsApp, visualizações de perfil, favoritos e engajamento comunitário. A mudança é de vocabulário e contrato interno, não de regra de cálculo.

## Decisão

- Renomear labels, cards, filtros, colunas, legendas, textos vazios e alertas operacionais do Admin para **Demanda**.
- Renomear o contrato Admin/Backend relacionado para `demand`, `demand_engagement`, `strong_demand`, `low_demand` e `psychologist_no_demand`.
- Atualizar os links profundos da lista Admin para usar `demand` e `demand_engagement` nos filtros reais.
- Manter os mesmos thresholds e fontes reais já existentes, sem endpoint paralelo, seed, mock, package novo ou migration.
- Atualizar documentação histórica ativa e índice de ADRs para usar o vocabulário padronizado.

## Consequências

- URLs administrativas geradas a partir do dashboard passam a carregar `demand_engagement=...`.
- O frontend Admin e o backend Admin ficam alinhados no mesmo vocabulário de domínio.
- Não há alteração de banco, dados históricos, cálculo estatístico ou exposição pública ao usuário final.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- HTTP local `GET http://localhost:3002/psicologos` retornou 200.
- Bundle Admin gerado em `admin/.next/static/chunks/app` não contém o vocabulário administrativo substituído e contém **Demanda**, **Demanda x Engajamento** e `demand_engagement`.