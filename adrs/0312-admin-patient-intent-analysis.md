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

O score normalizado de 0 a 100 usa pesos internos: abertura de perfil como sinal fraco, retorno ao mesmo perfil como recorrencia, favorito como consideracao ativa e clique no WhatsApp como sinal forte de contato. O resultado exibido usa a nomenclatura de produto **Frio**, **Curioso**, **Interessado** ou **Qualificado**.

A UI deve posicionar o bloco **Analise de intencao do paciente** antes de **Estatisticas de comunidade**, com filtro de periodo proprio e copy explicita de privacidade: indicador interno do Admin, nao exibido a pacientes ou psicologos, sem inferir sessao, atendimento, diagnostico ou conteudo de conversa.

Nenhum tracking novo, migration, schema Prisma, seed, mock, backfill artificial ou package novo sera criado nesta decisao.

## Consequencias

- O Admin ganha leitura operacional do funil paciente -> psicologo usando somente sinais reais ja existentes.
- Pacientes sem eventos reais aparecem como **Frio** em producao e em ambientes sem a previa visual local habilitada.
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

## Atualizacao 2026-07-23: classificacao de intencao na aba Geral

Apos feedback visual de produto, a aba **Geral** do detalhe administrativo de paciente passa a
exibir um terceiro card resumido, **Intencao**, imediatamente apos **Engajamento**.

O card nao cria novo contrato nem recalcula dados no frontend: ele reutiliza o `intent_analysis`
real ja retornado por `GET /api/admin/private/patients/:id` e traduz o nivel em uma classificacao
operacional visivel, sem exibir a linguagem interna "Temperatura" na UI:

- `high` -> **Qualificado**;
- `medium` -> **Interessado**;
- `low` -> **Curioso**;
- `no_signals` -> **Frio**.

O resumo mostra nivel, score, quantidade de sinais reais e ultimo sinal, com CTA para a analise
completa na aba **Estatisticas**. A decisao preserva o carater interno do Admin, sem expor a
classificacao a pacientes ou psicologos e sem inferir sessao, atendimento, diagnostico ou conteudo de
conversa.

Validacoes adicionais:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em desktop `1365x900` e mobile `390x844`, validando a ordem
  **Conta** -> **Engajamento** -> **Intencao**, o titulo **Frio**, a ausencia do termo visivel
  **Temperatura**, o score e ausencia de overflow horizontal no mobile.

## Atualizacao 2026-07-23: previa visual local na analise completa

Apos feedback visual de produto, a aba **Estatisticas** pode preencher tambem a **Analise de
intencao do paciente** com numeros de exemplo somente no ambiente local/de desenvolvimento, para o
paciente de preview `cmrqsrab5001f1guh2ve5oy90` e apenas quando a propria analise nao possui sinais
reais no recorte selecionado.

Essa excecao e somente de renderizacao client-side para avaliacao visual: nao altera backend,
endpoint, contrato HTTP, schema Prisma, banco, seed, backfill, tracking ou dados persistidos. Se
houver qualquer sinal real de intencao, a UI preserva os dados reais. Em build/producao, a previa
continua desativada e pacientes sem eventos reais seguem como **Frio**.

O aviso global da previa visual local foi removido da interface conforme feedback, mantendo a
limitacao registrada neste ADR e na task.

Validacoes adicionais:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em desktop `1365x900` e mobile `390x844`, validando ausencia do aviso
  global, score de exemplo `96/100`, numeros de exemplo nos sinais de intencao e ausencia de
  overflow horizontal no mobile.

## Atualizacao 2026-07-23: nomenclatura final Frio/Curioso/Interessado/Qualificado

Por decisao direta de produto, o resultado visivel da analise individual de intencao do paciente passa a usar somente quatro classificacoes: **Frio**, **Curioso**, **Interessado** e **Qualificado**.

Os ids tecnicos foram mantidos para compatibilidade (`no_signals`, `low`, `medium`, `high`), mas o label retornado no contrato e exibido na UI mudou para:

- `no_signals` -> **Frio**;
- `low` -> **Curioso**;
- `medium` -> **Interessado**;
- `high` -> **Qualificado**.

A mudanca e apenas de nomenclatura de produto. Nao altera pesos, fontes reais, calculo, endpoint, schema Prisma, migration, tracking, seed ou exposicao publica. Validado com `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, service local `showAdminPatient(...)` e browser local/headless em desktop e mobile.
