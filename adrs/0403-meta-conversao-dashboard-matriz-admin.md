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
- Classificar a meta com a regra absoluta, mas expor nomenclatura operacional simplificada:
  - **Dados insuficientes** durante os primeiros 30 dias de adaptação;
  - **Abaixo da meta** com menos de 5 conversões equivalentes em 30 dias, incluindo 0 cliques reais;
  - **Na Meta** entre 5 e 9 conversões equivalentes em 30 dias;
  - **Acima da meta** com 10 ou mais conversões equivalentes em 30 dias.
- Exibir **Meta de conversão** como card imediatamente após **Conversão** no carrossel de
  indicadores.
  O layout dos donuts permanece simples, sem painel interno, destaque "Maior grupo" ou barras na legenda.
- Adicionar o eixo `conversion_goal` / **Meta de conversão** à matriz de cruzamento, usando os
  mesmos eventos reais de `contact_request.channel=whatsapp`.

## Consequências

- O Admin passa a ver simultaneamente o padrão relativo da plataforma e a meta operacional absoluta.
- A matriz permite cruzar meta absoluta com atividade, cobertura, engajamento, visibilidade,
  favoritos, conteúdo, avaliações e posição do vídeo.
- A leitura de meta deixa de exibir a categoria separada **Sem Conversão**; esses perfis são
  contabilizados em **Abaixo da meta** para manter gráfico e matriz com quatro opções.
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

Atualização de refinamento em 2026-08-02:

- Gráfico e matriz de **Meta de conversão** passaram a usar as opções **Na Meta**, **Acima da meta**,
  **Abaixo da meta** e **Dados insuficientes**.
- O texto do padrão visível passou a destacar a faixa **Entre 5 e 9 em 30 dias**.
- Tooltips dos indicadores do carrossel exibem apenas o texto descritivo da métrica.
- A elevação vertical no hover dos cards de gráficos foi removida para evitar corte da borda superior.
- As tooltips dos cards passaram a usar portal com posicionamento fixo, ancorado próximo ao ícone e
  com margem lateral clampada ao viewport, evitando corte nos cards das extremidades do carrossel.
