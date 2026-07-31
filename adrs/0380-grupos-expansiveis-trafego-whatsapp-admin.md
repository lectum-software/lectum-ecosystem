# ADR-0380: Grupos expansiveis na tabela de trafego WhatsApp Admin

## Status

Accepted

## Task relacionada

TASK-116

## Contexto

A tabela **Origem do trafego para psicologos** do dashboard Admin ja consolidava **Comunidades** como um bloco visual desde a TASK-115. O usuario pediu dois refinamentos adicionais:

- transformar os detalhes de Comunidades em um menu expansivel com seta discreta alinhada a direita da linha;
- criar um novo grupo **Video de apresentacao** somando **Explorar** e **Busca e filtros**, tambem com menu expansivel.

O contrato do backend continua retornando fontes atomicas reais de WhatsApp. A mudanca solicitada e de composicao e interacao da tabela, sem nova persistencia.

Builder/Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) nao ficou callable no ambiente desta execucao; a decisao visual foi validada com `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` e com screenshots enviados pelo usuario em 2026-07-31.

## Decisao

Manter o backend com fontes atomicas e derivar no Admin dois grupos de apresentacao:

- `Comunidades`, com os cinco detalhes comunitarios da TASK-114/TASK-115;
- `Video de apresentacao`, com `explore` e `search_filters`.

Os grupos sao recolhidos inicialmente. A linha principal de cada grupo e um controle acessivel de expansao; clicar em qualquer ponto da linha superior alterna o estado do menu. A seta fica no final da celula de WhatsApp, a direita do numero, sem fundo branco, borda ou botao visual pesado.

A ordenacao das linhas principais continua baseada em `whatsapp_clicks`, mas usando o somatorio de cada grupo derivado. O selo **Principal origem** tambem e aplicado apenas na linha principal mais forte, nao nos detalhes.

## Consequencias

- A tabela reduz altura inicial e melhora a leitura dos blocos principais.
- O Admin preserva rastreabilidade ao revelar os detalhes sob demanda, sem mudar contrato de API.
- A UI passa a manter dois agrupamentos visuais explicitos; se novas fontes relacionadas a video de apresentacao ou comunidade forem adicionadas, a lista de IDs no Admin deve ser atualizada.
- O clique em linha usa controles acessiveis (`button`) para manter teclado e leitores de tela funcionais.

## Validacao

- `pnpm --dir admin check` - sucesso.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` - sucesso.
- `pnpm check` - sucesso.
- Browser local em `http://localhost:3002/psicologos` via Chrome/CDP - sucesso em desktop 1440px e mobile 390px.
- Evidencias visuais geradas em `.tmp/task116-admin-psicologos-desktop.png` e `.tmp/task116-admin-psicologos-mobile.png`.

## Pendencias

- Nenhuma pendencia externa.
