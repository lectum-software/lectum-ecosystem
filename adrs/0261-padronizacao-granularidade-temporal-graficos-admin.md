# ADR 0261: Padronização de granularidade temporal dos gráficos Admin

## Status

Aceito.

## Contexto

Os gráficos temporais do Admin estavam usando regras diferentes de rotulagem e agrupamento. A aba de estatísticas de negócio do detalhe do psicólogo já havia adotado a leitura por dias em períodos curtos e por meses em períodos longos, sem agrupamento semanal.

## Decisão

Padronizar os gráficos temporais do Admin com um helper compartilhado em `admin/src/lib/chart-time-series.ts`:

- até 31 dias: manter pontos diários;
- acima de 31 dias: consolidar por mês;
- métricas de fluxo usam soma mensal;
- métricas de estoque/snapshot usam o último valor do mês;
- rótulos visuais usam data curta ou mês/ano, e o resumo textual preserva o intervalo do bucket.

A regra foi aplicada aos gráficos temporais de Dashboard, Comunidades, Detalhe de comunidade, Financeiro, Pacientes, Detalhe de paciente, Dashboard de psicólogos e Estatísticas do psicólogo.

## Consequências

- Evita gráficos ilegíveis em períodos longos.
- Remove divergência entre gráficos por semana e por mês.
- Centraliza a regra de bucket temporal sem alterar contratos backend.
- Não muda dados persistidos, schema Prisma ou migrations.
