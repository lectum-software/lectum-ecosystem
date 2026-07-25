# ADR-0317: Filtro Cortesia no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos possui filtros por plano nos blocos de analytics. A opcao **Todos** agrega todos os psicologos ativos no periodo, incluindo contas com cortesia administrativa. Ate este ajuste, os filtros explicitavam apenas **Todos**, **Gratuitos** e **Assinantes**.

Na analise de `Devices e sistemas`, isso gerou ambiguidade: sessoes reais de psicologos em cortesia apareciam em **Todos**, mas os recortes **Gratuitos** e **Assinantes** ficavam vazios. Como cortesia administrativa (`professional_subscription.source="admin_grant"`) e uma categoria operacional propria, mistura-la em **Assinantes** distorceria metricas pagas Mercado Pago.

## Decisao

- Adicionar `courtesy` ao contrato `plan_segments` do dashboard Admin de psicologos.
- Exibir **Cortesia** nos selects de filtro por plano existentes da pagina `/psicologos`.
- Manter **Assinantes** restrito a assinatura profissional paga real Mercado Pago ativa.
- Manter **Gratuitos** restrito ao plano gratuito ativo.
- Manter **Todos** como soma de todos os segmentos, incluindo cortesia.
- Reutilizar o endpoint e a agregacao existentes; nao criar endpoint paralelo, migration, seed, backfill ou dado estimado.

## Consequencias

- O Admin passa a explicar de forma operacional a parcela de uso que vem de concessoes administrativas.
- Analises como **Devices e sistemas**, **Modo de cadastro**, **Uso da plataforma**, **Origem do trafego** e **Comparativo de oferta e demanda** passam a ter recorte especifico de cortesia.
- Relatorios pagos continuam honestos: cortesia nao vira receita nem assinante Mercado Pago.
- O contrato do dashboard ganha mais uma chave obrigatoria em `plan_segments`; o app Admin foi atualizado para aceitar esse segmento.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke direto do service com `.env` local confirmando `plan_segments.courtesy` e sessoes reais de cortesia no periodo.
- Browser local em `http://localhost:3002/psicologos`.
