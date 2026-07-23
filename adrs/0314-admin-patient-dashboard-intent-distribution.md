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
- **Objetivos**: favoritaram psicologos ou retornaram a perfis, sem clique no WhatsApp;
- **Muito qualificados**: clicaram no WhatsApp ou concentraram multiplos sinais fortes.

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
