# ADR-0312 - Analise de intencao do paciente no Admin

## Status

Accepted

## Contexto

O Admin precisa diferenciar pacientes que apenas navegam na plataforma daqueles que demonstram maior intencao de contato com psicologos. O produto nao realiza sessao, atendimento, diagnostico ou conversa dentro do site; o sinal maximo observavel no funil atual e o clique no WhatsApp.

A solicitacao explicita que esta leitura deve ser somente administrativa, sem exposicao publica e sem exibicao para psicologos ou pacientes.

## Decisao

Adicionar `intent_analysis` ao contrato real de `GET /api/admin/private/patients/:id`, dentro do detalhe administrativo do paciente.

A analise sera deterministica, por periodo, sem modelo probabilistico e sem dados inventados. As fontes sao:

- `profile_view_event.viewer_id` com `source=profile_page` para aberturas reais de perfil de psicologos;
- `psychologist_favorite.user_id` com `deleted=false` para favoritos ativos;
- `contact_request.user_id` com `channel=whatsapp` para cliques reais no CTA de WhatsApp;
- retornos ao mesmo perfil derivados de multiplas aberturas para o mesmo `psychologist_id` no periodo.

O score normalizado de 0 a 100 usa pesos internos: abertura de perfil como sinal fraco, retorno ao mesmo perfil como recorrencia, favorito como consideracao ativa e clique no WhatsApp como sinal forte de contato. O nivel exibido pode ser **Sem sinais**, **Baixa intencao**, **Media intencao** ou **Alta intencao**.

A UI deve posicionar o bloco **Analise de intencao do paciente** antes de **Estatisticas de comunidade**, com filtro de periodo proprio e copy explicita de privacidade: indicador interno do Admin, nao exibido a pacientes ou psicologos, sem inferir sessao, atendimento, diagnostico ou conteudo de conversa.

Nenhum tracking novo, migration, schema Prisma, seed, mock, backfill artificial ou package novo sera criado nesta decisao.

## Consequencias

- O Admin ganha leitura operacional do funil paciente -> psicologo usando somente sinais reais ja existentes.
- Pacientes sem eventos reais aparecem como **Sem sinais**, mesmo quando a previa visual local de desenvolvimento preenche outros blocos estatisticos.
- Psicologos e pacientes nao recebem esse score, evitando uso como pressao comercial ou exposicao indevida.
- A calibragem de pesos pode ser alterada futuramente em ADR proprio se houver revisao de produto/analytics.
- Favoritos removidos (`deleted=true`) nao contam como favoritos ativos no periodo.

## Task relacionada

- TASK-61 - Detalhe administrativo do paciente, ajuste pos-feedback de 2026-07-23.

## Validacoes

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsrab5001f1guh2ve5oy90", period: "all" })` retornou `intent_analysis` real com fonte `profile_view_event+psychologist_favorite+contact_request`.
- Browser local/headless via Chrome/CDP em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`, desktop `1365x900` e mobile `390x844`, validou ordem do bloco, score, metrica WhatsApp, nota de privacidade e ausencia de overflow global mobile.

## Pendencias

Nenhuma pendencia externa nesta execucao.
