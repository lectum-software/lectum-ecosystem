# ADR-0314: Distribuicao agregada de intencao dos pacientes no dashboard Admin

## Status

Accepted

## Contexto

O Admin precisa distinguir, de forma agregada, se a base de pacientes esta apenas navegando ou se demonstra intencao real de contato com psicologos. O produto tambem definiu restricoes importantes: a leitura nao pode virar pressao comercial, nao deve ser exibida publicamente, nao deve ser exposta a psicologos e nao pode inferir sessao, atendimento, diagnostico ou conversa, ja que o site observa no maximo discovery e clique no WhatsApp.

Ja existe a analise individual de intencao no detalhe do paciente (ADR-0312). O dashboard de pacientes precisava de uma leitura percentual da base logo abaixo de **Visao Geral**.

## Decisao

Adicionar `intent_analysis` ao payload de `GET /api/admin/private/patients/dashboard`, calculado somente com sinais reais ja persistidos no periodo selecionado:

- `profile_view_event.viewer_id` com `source="profile_page"` para abertura de perfil publico de psicologo;
- `psychologist_favorite.user_id` nao deletado para favoritos ativos;
- `contact_request.user_id` com `channel="whatsapp"` para clique no WhatsApp;
- repeticao de abertura do mesmo perfil por paciente/psicologo como retorno real ao perfil.

A distribuicao usa como denominador os pacientes reais existentes no final do periodo selecionado e classifica cada paciente em uma categoria unica:

- **Frios**: sem abertura de perfil, favorito ou clique no WhatsApp no periodo;
- **Curiosos**: abriram perfil/baixa intencao, sem favorito ou WhatsApp;
- **Interessados**: favoritaram psicologos ou retornaram a perfis, sem clique no WhatsApp;
- **Qualificados**: clicaram no WhatsApp ou concentraram multiplos sinais fortes.

A UI do Admin mostra apenas agregados: percentual, contagem por categoria e totais de sinais. Nao retorna lista nominal neste bloco, nao expande eventos brutos e inclui copy de privacidade informando que o indicador e interno do Admin e nao representa diagnostico, atendimento ou conteudo de conversa.

## Consequencias

- O dashboard passa a responder se a base tem sinais de intencao sem criar tracking novo ou dados artificiais.
- Pacientes sem sinais entram como **Frios**, mantendo percentual sobre a base total e evitando inflar segmentos quentes.
- Cliques no WhatsApp sao o sinal mais forte, pois representam o limite maximo observado pelo site.
- A classificacao e operacional/produto, nao clinica. Qualquer uso futuro em CRM, notificacao, ranking publico ou repasse para psicologos exigira nova decisao de produto/privacidade.
- Nao houve schema Prisma, migration, package novo, seed, mock ou backfill.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `buildPatientsDashboard({ period: "all" })` retornou as quatro categorias de `intent_analysis` com dados reais.
- Browser local headless autenticado confirmou o bloco abaixo de **Visao Geral**, as quatro categorias, nota de privacidade e mobile 390px sem overflow horizontal.

## Atualizacao 2026-07-23 - Label Interessados

O label de produto do segmento tecnico `objective` foi renomeado de **Objetivos** para **Interessados**. A mudanca evita sugerir que o paciente tomou uma decisao objetiva/rapida de contato; o segmento segue representando favoritos ou retornos a perfis sem clique no WhatsApp. O id tecnico foi mantido para compatibilidade do contrato.

## Atualizacao 2026-07-23 - Label Qualificados

Por decisao direta de produto, o segmento tecnico `very_qualified` do dashboard `/pacientes` foi renomeado visualmente de **Muito qualificados** para **Qualificados**.

O id tecnico `very_qualified` foi preservado para compatibilidade do contrato e o criterio de classificacao nao mudou: pacientes com clique no WhatsApp ou multiplos sinais fortes continuam entrando nesse segmento. A mudanca e somente de label de produto e foi validada com `buildPatientsDashboard({ period: "all" })`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless em desktop e mobile.

## Atualização 2026-07-25 - Filtros agregados por intenção

O dashboard `/pacientes` passou a expor `intent_filters` no contrato de `GET /api/admin/private/patients/dashboard` para permitir que os blocos **Gênero**, **Forma de cadastro**, **Devices e sistemas**, **Uso da plataforma** e **Localização** sejam recortados por **Todos**, **Frios**, **Curiosos**, **Interessados** e **Qualificados**.

A decisão preserva a classificação canônica já calculada em `intent_analysis`: o backend monta os recortes por segmento usando dados reais do mesmo período, e o Admin apenas alterna entre agregados prontos. Isso evita recalcular intenção no cliente e evita criar endpoint paralelo, tracking novo, seed, mock ou backfill.

Os recortes continuam agregados e internos ao Admin. Não há lista nominal por segmento nesses blocos, e localização permanece coarse via `visitor_location`, sem IP, coordenada ou endereço. Na UI, o seletor é compacto e sem o rótulo visual **Intenção**; a acessibilidade mantém label apenas `sr-only`.
