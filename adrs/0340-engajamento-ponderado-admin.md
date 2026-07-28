# ADR-0340: Score ponderado de engajamento comunitário no Admin

## Status

Accepted

## Task relacionada

TASK-90

## Contexto

As métricas Admin de engajamento já eram normalizadas para 30 dias, mas tratavam ações com naturezas diferentes como equivalentes. Isso permitia leituras ruins de produto: muitos votos ou posts poderiam aproximar um psicólogo de **Muito engajado** mesmo sem responder pacientes, enquanto pacientes que publicam dúvidas/relatos não eram diferenciados o suficiente de pacientes que só votam ou salvam.

A decisão precisava continuar usando eventos reais first-party, sem mock, backfill, novo tracking ou alteração de schema.

## Decisão

- Manter a normalização em 30 dias como base comparável entre janelas e coortes.
- Substituir a soma bruta de interações por score ponderado nos diagnósticos Admin de psicólogos e pacientes.
- Psicólogos:
  - resposta de psicólogo a post de paciente pesa 4 e não tem teto;
  - post criado pesa 2 e tem teto de 6 pontos/30d;
  - resposta fora de post de paciente pesa 2 e tem teto de 8 pontos/30d;
  - voto pesa 0,5 e tem teto de 3 pontos/30d;
  - **Muito engajado** exige score 12+ e pelo menos 2 respostas a posts de pacientes/30d.
- Pacientes:
  - post pesa 4 e não tem teto;
  - resposta pesa 2 e não tem teto;
  - salvamento pesa 1,5 e tem teto de 6 pontos/30d;
  - voto pesa 0,5 e tem teto de 3 pontos/30d.
- Cortes operacionais:
  - abaixo de 3 pontos/30d: sem base/sinal suficiente;
  - 3 a 5 pontos/30d: pouco engajado;
  - 6 a 11 pontos/30d: engajado;
  - 12+ pontos/30d: muito engajado, respeitando a trava qualitativa de psicólogos.
- Expor pesos, tetos e cortes nos contratos Admin para evitar hardcode opaco na UI.

## Consequências

- Psicólogos só chegam a **Muito engajado** se houver cobertura real de pacientes, não apenas ações leves.
- Pacientes que criam posts ou respondem passam a ser mais representativos que pacientes que só votam/salvam.
- Votos e salvamentos continuam contando como sinal, mas não dominam o diagnóstico.
- A métrica continua observacional e interna ao Admin; não vira ranking público nem decisão automática de punição.
- O contrato Admin cresce com campos de score/thresholds, mas sem endpoint paralelo, migration, seed ou package novo.

## Validação

- `pnpm --dir backend exec biome check --write ...` nos arquivos backend alterados.
- `pnpm --dir admin exec biome check --write ...` nos arquivos admin alterados.
- `pnpm --dir backend check`.
- `pnpm --dir admin check`.
- Smoke direto com `pnpm --dir backend exec tsx -e`, confirmando a trava de respostas a pacientes para psicólogos e os tetos de votos/salvamentos para pacientes.
- `pnpm --dir backend build`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local/headless em viewport mobile 390px:
  - `/psicologos`, confirmando copy do critério ponderado, trava por respostas a posts de pacientes e ausência de overflow horizontal;
  - `/psicologos/lista?engagement=sem_base`, confirmando filtro **Sem engajamento** e ausência de overflow horizontal;
  - `/pacientes`, confirmando copy do critério ponderado de pacientes e ausência de overflow horizontal.
- O browser local usou admin temporário real criado via `admin:bootstrap`; o registro e seus tokens foram removidos do banco ao final da validação.

## Pendências

- Nenhuma.
