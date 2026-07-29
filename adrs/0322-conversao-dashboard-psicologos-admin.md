# ADR-0322 - Conversão agregada no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O produto precisa saber, de forma interna e agregada, quantos psicologos estao tendo resultados de negocio na Lectum. A informacao nao deve ser publica, nao deve ranquear psicologos entre si e nao deve ser usada como punicao. Ela complementa a leitura de "temperatura" dos pacientes com uma leitura operacional dos resultados dos profissionais.

As fontes reais disponiveis sao:

- `profile_view_event.source="profile_page"` para aberturas do perfil publico;
- `contact_request.channel="whatsapp"` para cliques de WhatsApp;
- `psychologist_favorite` para favoritos.

Como o dashboard Admin tem filtros de periodo que variam de "Hoje" a "Todo o periodo", a classificacao nao pode comparar psicologos entre si nem usar apenas totais brutos da janela, pois periodos longos favoreceriam perfis antigos e periodos curtos poderiam superestimar perfis recem-criados.

## Decisao

Adicionar ao dashboard Admin de psicologos um bloco **Conversão** calculado individualmente por psicologo e exibido apenas de forma agregada por categoria.

A V1 usa cinco categorias:

1. **Alta Conversão** - WhatsApp e o sinal mais forte e prevalece sobre as outras metricas.
2. **Interesse Nao Convertido** - muitos favoritos, mas poucos cliques no WhatsApp.
3. **Trafego Nao Convertido** - muitas aberturas de perfil, mas poucos cliques no WhatsApp.
4. **Baixa Conversão** - poucos cliques no WhatsApp, poucas aberturas de perfil e poucos favoritos.
5. **Dados Insuficientes** - perfil com janela ativa curta demais para leitura estavel, salvo quando WhatsApp ja indica Alta Conversão.

Os cortes sao normalizados para 30 dias a partir dos dias ativos do perfil dentro da janela selecionada:

- WhatsApp alto: 5+ cliques/30d;
- WhatsApp forte com conversao: 3+ cliques/30d, 2+ cliques reais e taxa WhatsApp/perfil >= 5%;
- Trafego alto: 60+ aberturas de perfil/30d;
- Interesse alto: 5+ favoritos/30d;
- Dados insuficientes: menos de 7 dias ativos dentro da janela, exceto quando WhatsApp ja caracteriza Alta Conversão.

A UI mostra grafico de pizza, quantidades e percentuais de psicologos em cada categoria logo abaixo da visao geral e antes de **Origem do trafego**. A legenda fica em duas colunas no desktop, mantendo leitura mobile-first em uma coluna; a ordem visual e Alta Conversão ao lado de Interesse Nao Convertido, Trafego Nao Convertido ao lado de Baixa Conversão e Dados Insuficientes em linha propria. O bloco oferece filtro por plano (Todos, Gratuitos, Assinantes e Cortesia), calculado no backend por segmento para evitar filtragem visual sem base real. Para manter o bloco mais executivo, a interface nao exibe texto introdutorio, contadores agregados, totais de eventos por categoria nem a faixa tecnica dos cortes; em cada card de categoria, a quantidade aparece junto ao percentual no formato `1 (6,7%)`, com a taxa em menor peso visual. Nao ha lista individual, ranking ou exportacao por profissional nesta entrega.

Complemento de 2026-07-25: a aba individual **Estatisticas** do psicologo tambem pode exibir a mesma classificacao como tag operacional ao lado do titulo **Estatisticas de negocio**. O calculo permanece privado/Admin, usa o mesmo periodo selecionado e as mesmas fontes reais (`profile_view_event`, `contact_request` e `psychologist_favorite`). A tag individual nao muda a decisao original: nao e publica, nao cria ranking, nao exporta lista punitiva e serve apenas para contextualizar o detalhe do psicologo que o Admin ja abriu.

## Consequencias

- O Admin ganha uma visao rapida de saude de resultado dos psicologos sem expor informacao sensivel ao publico.
- O calculo fica estavel para `Todo o periodo`, `Este ano` e janelas customizadas porque os sinais sao normalizados por dias ativos.
- Psicologos recem-criados nao sao marcados como baixa performance por falta de tempo de exposicao, salvo quando ja ha sinal forte de WhatsApp.
- A decisao nao cria schema, migration, package novo, mock, seed ou fonte estimada.
- A tag individual evita recalculo local divergente no Admin porque o endpoint real de estatisticas do psicologo retorna a categoria e os sinais usados.
- Futuras versoes podem calibrar os cortes com dados reais de conversao, mas devem registrar novo ADR se mudarem regra de dominio ou exposicao individual.

## Validacao

- Smoke local de `buildPsychologistsDashboard({ period: "all" })` retornou `profile_conversion` com cinco categorias, totais reais e percentuais.
- Checks/builds da task foram executados conforme registrado em `TASK-84`.
- Complemento individual de 2026-07-25 validado com `showAdminPsychologistStatistics({ id: "cmrgztri7000tn0uh1q4n8vxf", period: "all" })`, HTTP Admin autenticado do endpoint de estatisticas, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless em desktop 1365px e mobile 390px.
- Refinamento de UI em 2026-07-25 validado com smoke local confirmando ordem, novas descricoes e `plan_segments.*.profile_conversion`, alem de bundle do Admin com `profile-conversion-plan-segment`, checks/builds de backend/admin e `pnpm check`.
- Refinamento compacto da legenda em 2026-07-26 validado com `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e HTTP local `GET http://localhost:3002/psicologos` retornando 200.
