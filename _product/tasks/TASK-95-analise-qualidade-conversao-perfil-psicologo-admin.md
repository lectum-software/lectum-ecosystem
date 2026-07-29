# TASK-95 - Análise de qualidade da conversão no perfil Admin do psicólogo

## Status

Completed

## Contexto

O dashboard Admin de psicólogos em `/psicologos` já possui uma leitura agregada e simples de
**Conversão**, baseada em cliques WhatsApp reais no período selecionado e comparação por percentis
da plataforma. Essa visão deve continuar enxuta para leitura executiva da base.

No detalhe individual do psicólogo, a leitura pode ser mais diagnóstica: além de indicar se o
profissional está acima, na referência ou abaixo da plataforma, o Admin precisa saber se o volume
absoluto de conversões já é saudável para aquele perfil.

## Escopo

- Manter o dashboard `/psicologos` com as categorias agregadas atuais.
- Expandir o contrato real de `GET /api/admin/private/psychologists/:id/statistics` em
  `business.profile_conversion` com:
  - qualidade absoluta da conversão;
  - ritmo de cliques WhatsApp normalizado para 30 dias;
  - posição contra a referência da plataforma;
  - frase diagnóstica combinada para uso no perfil individual.
- Atualizar a UI do detalhe Admin do psicólogo para exibir a análise composta no card/aba de
  estatísticas, preservando layout mobile-first.

## Regras de classificação

- O período de adaptação permanece em 30 dias desde `user.createdAt` até o fim da janela selecionada.
- A qualidade absoluta usa cliques WhatsApp reais no período, normalizados por dias ativos na janela:
  `cliques_whatsapp / dias_ativos * 30`.
- Cortes absolutos:
  - `0` cliques reais no período: **Sem Conversão**;
  - maior que `0` e menor que `5` conversões equivalentes em 30 dias: **Conversão Baixa**;
  - `>= 5` e `< 10` conversões equivalentes em 30 dias: **Conversão Boa**;
  - `>= 10` conversões equivalentes em 30 dias: **Conversão Excelente**.
- A posição relativa usa a mediana/P50 da plataforma no período, calculada entre psicólogos fora da
  adaptação e com ao menos um clique WhatsApp, sem alterar o cálculo agregado por P25/P75 do
  dashboard.

## Fora do escopo

- Alterar as categorias agregadas do dashboard `/psicologos`.
- Criar ranking, punição pública, mock, seed, endpoint paralelo, migration ou novo package.
- Trocar o cálculo histórico de percentis P25/P75 usado pela visão agregada.

## Critérios de aceite

- [x] O dashboard `/psicologos` mantém as opções agregadas atuais de Conversão.
- [x] O detalhe Admin do psicólogo recebe e exibe qualidade absoluta de Conversão, posição relativa
      e frase diagnóstica combinada.
- [x] A qualidade absoluta usa cliques WhatsApp reais normalizados para 30 dias.
- [x] **Conversão Boa** começa em `5` conversões equivalentes em 30 dias e
      **Conversão Excelente** começa em `10`.
- [x] A comparação relativa usa a mediana/P50 da plataforma como referência individual.
- [x] A UI permanece mobile-first e não usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema Prisma ou migration foi
      criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit próprio criado e push executado.

## Validação

- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a execução usa
  `_product/tasks/PROTO-INVENTORY.md` e a referência local
  `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- `pnpm --dir backend exec biome check --write src/utils/admin-profile-conversion.ts src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts`
- `pnpm --dir admin exec biome check --write src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Smoke direto do helper de conversão confirmou `3` cliques em `15` dias ativos como `normalized=6`,
  `quality="good_conversion"`, `position="below_reference"` e headline
  **"Conversão Boa, mas abaixo da referência da plataforma."**
- Chamada direta de `showAdminPsychologistStatistics` confirmou que
  `business.profile_conversion` retorna `headline`, `quality`, `platform_position` e
  `signals.normalized_whatsapp_clicks_30d`.
- `pnpm --dir frontend check` foi executado porque havia arquivos locais preexistentes de analytics
  no workspace e a validação raiz depende do frontend.
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- HTTP local no Admin dev server retornou `200` para
  `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` e
  `http://localhost:3002/psicologos`.
- Validação estática do build confirmou no chunk de `/psicologos/[id]` as copies
  **Qualidade individual**, **Ritmo estimado** e **Referência da plataforma**.

## Observações

- Não há alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` não se aplica à execução desta task.
