# ADR-0387 - Donut de Atividade no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos ja exibia donuts agregados para visibilidade, engajamento, favoritos e conversao. A definicao vigente da TASK-111 trata **Atividade** como volume bruto de acoes autorais reais do psicologo nas comunidades (`posts + respostas`), enquanto cobertura, video e qualidade permanecem analises separadas.

O usuario pediu um donut de **Atividade** no mesmo bloco de sinais agregados. A solucao precisava respeitar periodo, filtro por plano, mobile-first, dados reais e o carrossel definido na TASK-122, sem criar endpoint paralelo nem alterar persistencia.

## Decisao

1. Adicionar `profile_activity` ao contrato real de `GET /api/admin/private/psychologists/dashboard` e aos recortes de `plan_segments`.
2. Calcular Atividade no backend a partir de `community_post.author_id` e `post_reply.author_id`, filtrando `createdAt` pelo periodo selecionado e pelos psicologos do segmento de plano.
3. Classificar o volume de acoes com os mesmos limiares usados no diagnostico visual do detalhe individual:
   - `muito_ativo`: 12 ou mais acoes;
   - `ativo`: 6 a 11 acoes;
   - `pouco_ativo`: 3 a 5 acoes;
   - `sem_base`: menos de 3 acoes.
4. Exibir o card **Atividade** como primeiro item do carrossel de donuts e atualizar o titulo do bloco para incluir Atividade.
5. Usar o bloco **Padrao da plataforma** do card para comunicar a faixa operacional **Ativo** (`6 a 11 acoes`), em vez de criar benchmark percentual novo.
6. Nao alterar schema Prisma, migrations, ranking publico, lista administrativa, detalhe individual, formulas de visibilidade/engajamento/favoritos/conversao ou packages.

## Consequencias

- A leitura agregada passa a mostrar distribuicao de producao autoral dos psicologos junto dos demais sinais de funil.
- O calculo fica auditavel e server-side; o frontend nao infere atividade a partir de totais agregados.
- O filtro por plano permanece consistente porque `profile_activity` e calculado dentro de cada `plan_segment`.
- A faixa padrao e fixa por decisao operacional atual, nao derivada de percentis; se produto quiser benchmark dinamico, sera preciso nova task/ADR.
- O contrato da API cresce sem migration e sem endpoint novo.

## Task relacionada

- `_product/tasks/TASK-123-donut-atividade-dashboard-psicologos-admin.md`

## Validacoes

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local via Chrome/CDP headless em `http://localhost:3002/psicologos`, com backend real em
  `localhost:3001`, validando contrato `profile_activity`, ordem do card, categorias, faixa
  **6 a 11 acoes** e ausencia de overflow global em 390px.

## Pendencias

- Nenhuma pendencia externa.
