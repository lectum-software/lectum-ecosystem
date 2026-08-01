# ADR-0403: Meta de conversão no dashboard e matriz Admin

## Status

Accepted

## Task relacionada

TASK-139

## Contexto

O dashboard Admin de psicólogos já tinha a leitura relativa **Conversão**, baseada em cliques reais
de WhatsApp comparados aos percentis da plataforma. A TASK-95/ADR-0353 definiu também uma leitura
absoluta individual: ritmo de WhatsApp normalizado para 30 dias, com meta saudável a partir de 5
conversões equivalentes.

Produto pediu tornar essa meta visível no dashboard e permitir cruzá-la com os demais eixos da
matriz de cruzamento de dados.

## Decisão

- Criar o agregado `profile_conversion_goal` no contrato do dashboard Admin de psicólogos.
- Classificar a meta com a mesma regra da qualidade absoluta:
  - **Dados Insuficientes** durante os primeiros 30 dias de adaptação;
  - **Sem Conversão** com 0 cliques reais no período;
  - **Conversão Baixa** com mais de 0 e menos de 5 conversões equivalentes em 30 dias;
  - **Conversão Boa** com pelo menos 5 e menos de 10 conversões equivalentes em 30 dias;
  - **Conversão Excelente** com 10 ou mais conversões equivalentes em 30 dias.
- Exibir **Meta de conversão** como card imediatamente após **Conversão** no carrossel de
  indicadores.
  O layout dos donuts permanece simples, sem painel interno, destaque "Maior grupo" ou barras na legenda.
- Adicionar o eixo `conversion_goal` / **Meta de conversão** à matriz de cruzamento, usando os
  mesmos eventos reais de `contact_request.channel=whatsapp`.

## Consequências

- O Admin passa a ver simultaneamente o padrão relativo da plataforma e a meta operacional absoluta.
- A matriz permite cruzar meta absoluta com atividade, cobertura, engajamento, visibilidade,
  favoritos, conteúdo, avaliações e posição do vídeo.
- Não há alteração de banco, migration, tracking, seed, backfill, endpoint paralelo ou package novo.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir backend typecheck`.
- `pnpm --dir backend check`.
- `pnpm --dir admin check`.
- `pnpm --dir backend build`.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`.
- `pnpm check`.
- `node .tmp/validate-task139.mjs` confirmou API, ordem do card, criterios da tooltip, eixo `conversion_goal`, selects Linha/Coluna, matriz **Meta de conversao x Conversao** e layout em 390px.
