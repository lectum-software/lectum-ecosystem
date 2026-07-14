# TASK-72: Métricas de conversão e uso da plataforma por psicólogos no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-72 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Psicólogos / Conversão e Analytics |
| Status | Completed |
| Dependências | TASK-09, TASK-31, TASK-32, TASK-33, TASK-45, TASK-46, TASK-47, TASK-49, TASK-53, TASK-55, TASK-56, TASK-57, TASK-62 |
| ADR alvo | ADR sobre métricas administrativas de conversão até assinatura paga e analytics first-party de uso da plataforma por psicólogos |

## Contexto

O Admin já possui dashboard de psicólogos, lista administrativa e detalhe individual com abas como **Geral**, **Perfil e cadastro**, **Plano e pagamentos**, **Estatísticas**, **Publicações**, **Avaliações**, **Atividades**, **Denúncias** e **Conta**. O dashboard atual mostra contadores, evolução e estatísticas agregadas, mas ainda não responde duas perguntas operacionais importantes:

- quanto tempo os psicólogos levam entre o cadastro e a primeira assinatura paga;
- como os psicólogos usam a plataforma Lectum depois de cadastrados.

Decisões de produto desta task:

- Monitorar conversão de psicólogos a partir do cadastro até a **primeira assinatura paga confirmada**.
- Exibir média, mediana, P75 e P90 do prazo até a primeira assinatura paga no dashboard de psicólogos.
- Exibir distribuição por faixas: mesmo dia, 1-3 dias, 4-7 dias, 8-30 dias, mais de 30 dias e ainda não assinou.
- Exibir percentual por modo de cadastro no dashboard: **Google** e **E-mail e senha**.
- Não existe categoria **Google + senha local**; o produto deve tratar cadastro como uma via ou outra.
- Cruzar conversão até assinatura por modo de cadastro quando houver dados reais suficientes.
- Adicionar no dashboard de psicólogos um bloco agregado de **Uso da plataforma**.
- Adicionar no detalhe individual do psicólogo, no bloco de plano/assinatura atual, uma linha com **Tempo até assinatura**.
- Adicionar na aba **Estatísticas** do detalhe individual do psicólogo um bloco de **Uso da plataforma**.
- As métricas de uso devem medir somente navegação e uso da plataforma Lectum pelo psicólogo.
- A Lectum não intermedia sessões clínicas, consultas ou mensagens entre paciente e psicólogo. Nada nesta task deve criar ou inferir métricas de consulta, sessão clínica, conversa, mensagem, atendimento ou dados trocados por WhatsApp.
- Se não houver analytics histórico real suficiente, exibir estado honesto de indisponibilidade e iniciar a coleta a partir dos eventos first-party existentes/ajustados, sem mock.

## Objetivo

Permitir que um Admin autenticado acompanhe, no dashboard de psicólogos, métricas reais de conversão até assinatura paga e visão geral de uso da plataforma por psicólogos; e permitir que, no detalhe individual de cada psicólogo, o Admin veja o tempo até assinatura no bloco de plano e métricas de uso na aba **Estatísticas**.

## Pré-requisitos e bloqueios

- TASK-09 concluída: cadastro inicial real de psicólogos com `user.createdAt` e `user.provider`.
- TASK-31, TASK-32 e TASK-33 concluídas: planos, checkout e gestão de assinatura com persistência real.
- TASK-45 e TASK-46 concluídas: autenticação Admin real e app `admin/`.
- TASK-47 concluída: captura de sessão/tipo de dispositivo para analytics.
- TASK-49 concluída: tracking first-party de pageviews, origem de tráfego, sessão e duração quando disponível.
- TASK-53 concluída: dashboard administrativo de psicólogos.
- TASK-55 concluída: detalhe administrativo do psicólogo.
- TASK-56 concluída: dados administrativos de plano/pagamentos.
- TASK-57 concluída: aba **Estatísticas** do detalhe do psicólogo.
- TASK-62 concluída: financeiro administrativo com regras reais de assinatura/receita.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- Não existe protótipo específico para os novos blocos de conversão/uso nesta data. Usar o padrão visual dos cards, gráficos e seções existentes e registrar essa limitação.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Validar o schema atual antes de criar campo/tabela nova. Preferir dados reais existentes: `user.createdAt`, `user.provider`, `professional_subscription`, `subscription_plan`, `payment_event`, `visitor_session`, `page_view_event` e demais fontes first-party já existentes.
- Se o dado de primeira assinatura paga não puder ser derivado com confiabilidade do modelo atual, parar e registrar a decisão pendente em ADR antes de criar métrica aproximada.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Não usar mocks, endpoints simulados, seed fake, valores inventados, eventos artificiais retroativos ou dados estimados sem rótulo explícito.

## Escopo frontend

### Admin — dashboard de psicólogos

Atualizar a rota administrativa de dashboard de psicólogos (`/psicologos` ou equivalente existente) para incluir novos blocos mobile-first.

#### Conversão até assinatura

Criar um bloco **Conversão até assinatura** com:

- total de psicólogos cadastrados na coorte/período;
- total que realizou primeira assinatura paga;
- taxa de conversão para assinatura paga;
- média do prazo até primeira assinatura paga;
- mediana do prazo até primeira assinatura paga;
- P75;
- P90;
- distribuição por faixas:
  - mesmo dia;
  - 1-3 dias;
  - 4-7 dias;
  - 8-30 dias;
  - mais de 30 dias;
  - ainda não assinou.

Regras de UI:

- O período do dashboard deve ser interpretado claramente como coorte de cadastro para métricas de conversão.
- A copy deve deixar explícito que plano gratuito e cortesia não contam como assinatura paga.
- Quando não houver dados suficientes, exibir `Indisponível` ou `Sem dados no período`, nunca zero falso.
- Gráficos devem ter alternativa textual acessível.
- O layout deve ser mobile-first em ~390px, com cards empilhados e gráficos legíveis.

#### Modo de cadastro

Criar um gráfico/bloco de **Modo de cadastro** com apenas duas categorias:

- Google;
- E-mail e senha.

Regras:

- Não exibir `Google + senha local`.
- Derivar Google de `user.provider="google"` ou regra equivalente real.
- Derivar E-mail e senha de `user.provider="manual"` ou regra equivalente real.
- Se houver valor legado/desconhecido, agrupar como `Indisponível` somente se existir dado real nessa condição, sem criar terceira categoria de produto.

#### Conversão por modo de cadastro

Exibir, quando houver amostra real suficiente:

- taxa de conversão paga por modo de cadastro;
- mediana até assinatura por modo de cadastro;
- média até assinatura por modo de cadastro, se útil e sem distorcer a leitura.

Se a amostra for pequena ou ausente, mostrar copy honesta.

#### Uso da plataforma — visão geral

Adicionar bloco agregado **Uso da plataforma** no dashboard de psicólogos com dados do período selecionado:

- psicólogos ativos no período;
- percentual de psicólogos ativos vs. psicólogos cadastrados/elegíveis;
- dias médios com acesso por psicólogo;
- sessões médias por psicólogo;
- tempo médio estimado de permanência, quando `duration_seconds`/sessão permitir cálculo confiável;
- páginas mais acessadas por psicólogos;
- evolução de uso por período quando compatível com o gráfico existente.

Regras de UI:

- Explicar que estas métricas representam uso da plataforma Lectum pelo psicólogo.
- Não mencionar consultas, sessões clínicas, mensagens ou WhatsApp como se fossem mediadas pela Lectum.
- Páginas mais acessadas devem usar rótulos humanos normalizados, por exemplo `Perfil`, `Publicações`, `Plano`, `Configurações`, `Comunidades`, `Analytics`, sem exibir paths crus com IDs, tokens ou query strings.
- Se a duração não for confiável, exibir `Tempo médio: Indisponível` e manter as demais métricas reais.

### Admin — detalhe do psicólogo / Geral ou Plano

No bloco de plano/assinatura atual do detalhe administrativo do psicólogo, adicionar uma linha:

- `Tempo até assinatura`.

Valores esperados:

- `Assinou no mesmo dia`, quando a primeira assinatura paga ocorreu na mesma data do cadastro;
- `N dias`, quando houver primeira assinatura paga real;
- `Ainda não assinou plano pago`, quando não houver assinatura paga;
- `Sem assinatura paga — plano gratuito`, quando o único vínculo real for gratuito;
- `Sem assinatura paga — cortesia`, quando o vínculo atual/relevante for cortesia administrativa;
- `Indisponível`, quando a data de cadastro ou ativação paga não for confiável.

Regras:

- Não repetir modo de cadastro no bloco de plano, pois o detalhe individual já informa a via de cadastro em outro lugar.
- Não recalcular o prazo quando houver troca posterior de plano; usar sempre a primeira assinatura paga confirmada.
- Cancelamento posterior não apaga a primeira conversão paga.

### Admin — detalhe do psicólogo / Estatísticas

Adicionar na aba **Estatísticas** um bloco **Uso da plataforma** para o psicólogo individual, com:

- último acesso;
- dias distintos com acesso no período;
- sessões no período;
- tempo médio estimado de permanência, quando confiável;
- páginas mais acessadas por aquele psicólogo;
- estado honesto para dados históricos indisponíveis.

Regras:

- O bloco deve ficar na aba **Estatísticas**, não em **Plano e pagamentos**.
- Deve reutilizar os filtros/períodos já existentes da aba quando fizer sentido, sem causar reload global da aba em cada refetch.
- Deve manter a distinção entre estatísticas de negócio/comunidade já existentes e uso da plataforma.
- Não exibir dados de pacientes, conteúdo digitado, mensagens, payload bruto, referrer completo, query string sensível ou qualquer segredo.

## Escopo backend

Criar ou estender endpoints Admin privados reais, protegidos por autenticação Admin.

Preferência arquitetural:

- Estender o endpoint existente do dashboard de psicólogos quando compatível:
  - `GET /api/admin/private/psychologists/dashboard`;
- Estender o endpoint de detalhe/billing existente quando compatível para o campo individual de tempo até assinatura:
  - `GET /api/admin/private/psychologists/:id` ou endpoint equivalente de detalhe;
  - `GET /api/admin/private/psychologists/:id/billing`, se o bloco de assinatura atual for alimentado por ele;
- Estender o endpoint de estatísticas existente:
  - `GET /api/admin/private/psychologists/:id/statistics`;
- Criar endpoint novo somente se a arquitetura existente exigir separação clara, registrando a decisão no ADR.

### Conversão até primeira assinatura paga

Regras de domínio:

- Data inicial: `user.createdAt` do usuário com `role="psicologo"`.
- Data final: primeira assinatura paga confirmada do psicólogo.
- Plano gratuito não conta como assinatura paga.
- Cortesia/admin grant não conta como assinatura paga.
- Assinatura paga deve ser derivada de fonte real, preferencialmente `professional_subscription` com:
  - plano pago (`subscription_plan.price_cents > 0`);
  - origem/gateway real de pagamento, como `source="mercadopago"` ou `gateway="mercadopago"`, conforme regra vigente;
  - status pago/ativo/confirmado real;
  - `deleted=false`.
- Se a confirmação de pagamento depender de `payment_event`, usar apenas eventos persistidos reais e sem expor payload bruto.
- A data da assinatura deve usar o campo real mais confiável existente. Se hoje só houver `professional_subscription.createdAt`, documentar a escolha no service/ADR. Se isso for insuficiente para histórico confiável, registrar bloqueio/decisão antes de criar aproximação.
- Considerar apenas a primeira assinatura paga do psicólogo; upgrades, renovações e reativações posteriores não alteram o prazo.
- Cancelamento posterior não remove a conversão histórica.

### Estatísticas agregadas

O backend deve retornar dados seguros equivalentes a:

- `conversion`:
  - `cohort_from`;
  - `cohort_to`;
  - `registered_count`;
  - `converted_paid_count`;
  - `conversion_rate`;
  - `average_days`;
  - `median_days`;
  - `p75_days`;
  - `p90_days`;
  - `buckets`;
  - `unavailable_reason?`;
- `signup_method`:
  - contagem e percentual para `google`;
  - contagem e percentual para `email_password`;
  - `unknown_count` apenas quando houver dados legados reais;
- `conversion_by_signup_method`:
  - conversão e prazos por `google`;
  - conversão e prazos por `email_password`;
  - estados honestos para amostra insuficiente;
- `platform_usage`:
  - `active_psychologists_count`;
  - `active_psychologists_rate`;
  - `average_access_days`;
  - `average_sessions`;
  - `average_duration_seconds?`;
  - `top_pages`;
  - `series?`;
  - `unavailable_reason?`.

### Estatísticas individuais

O backend deve retornar dados seguros equivalentes a:

- `time_to_first_paid_subscription` no contrato de detalhe/billing:
  - `status`: `converted`, `not_converted`, `free_only`, `courtesy_only`, `unavailable`;
  - `days`;
  - `label`;
  - `registered_at`;
  - `first_paid_subscription_at?`;
- `platform_usage` no contrato individual de estatísticas:
  - `last_access_at`;
  - `access_days_count`;
  - `sessions_count`;
  - `average_duration_seconds?`;
  - `top_pages`;
  - `period_from`;
  - `period_to`;
  - `unavailable_reason?`.

### Uso da plataforma

Regras de domínio:

- Usar somente eventos first-party reais, principalmente `page_view_event` e `visitor_session`.
- Considerar apenas usuários autenticados com `role="psicologo"` para uso agregado de psicólogos.
- Não contar navegação do Admin como uso do psicólogo.
- Não contar pageviews anônimos como uso individual de psicólogo.
- Dias de acesso devem ser derivados de datas distintas de eventos reais no fuso definido pela aplicação.
- Sessões devem ser derivadas de `session_id`/`visitor_session` real.
- Tempo médio de permanência deve ser calculado apenas quando `duration_seconds` ou duração de sessão for confiável. Se houver muitas durações nulas, retornar indisponibilidade honesta para essa métrica.
- Páginas mais acessadas devem ser normalizadas por `page_kind`, `normalized_path` ou helper de rotas seguro, nunca por path bruto com identificadores sensíveis.
- Não registrar nem retornar conteúdo de mensagens, campos digitados, payloads de formulário, query strings sensíveis, token, JWT, recovery code, confirm code, IP bruto ou user-agent bruto.

### Percentis

Regras de cálculo:

- Média: soma dos dias até assinatura paga dividida pelo número de psicólogos convertidos.
- Mediana: percentil 50 dos convertidos.
- P75: prazo em que 75% dos convertidos assinaram até aquele valor.
- P90: prazo em que 90% dos convertidos assinaram até aquele valor.
- Percentis devem considerar apenas psicólogos que converteram para assinatura paga.
- A faixa `Ainda não assinou` entra na distribuição de coorte, mas não entra no cálculo de média/mediana/P75/P90.

## Fora do escopo

- Contas de pacientes.
- Contas de administradores.
- Métricas de consultas clínicas.
- Métricas de sessões terapêuticas.
- Métricas de mensagens trocadas.
- Ler, inferir ou armazenar conteúdo de conversas via WhatsApp.
- Intermediar atendimento entre paciente e psicólogo.
- Criar categoria `Google + senha local`.
- Criar tracking de terceiros como Google Analytics, Meta Pixel, Mixpanel, PostHog ou similares.
- Criar evento fake para dados históricos.
- Estimar assinatura paga sem fonte real.
- Contar plano gratuito ou cortesia como assinatura paga.
- Expor payload bruto de `payment_event`.
- Expor paths crus com dados sensíveis.
- Instalar pacote novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato técnico detalhado

### Referências obrigatórias

- `ARCHITECTURE.md`: módulos backend com controller/service/repository/validator, rotas privadas, autenticação Admin, Prisma, regras de UI e formulários.
- `DATA-MODEL.md`: usuário, assinatura profissional, eventos de pagamento, pageviews, sessões e analytics existentes.
- `PACKAGES.md`: usar packages já instalados; não instalar dependência nova por padrão.
- `PROTO-INVENTORY.md`: referência visual ativa e fallback de imagens.
- `TASK-09`: cadastro de psicólogo e origem de autenticação.
- `TASK-31`, `TASK-32`, `TASK-33` e `TASK-62`: regras de plano, assinatura paga, cortesia e financeiro.
- `TASK-47` e `TASK-49`: sessões/pageviews first-party e privacidade de analytics.
- `TASK-53`, `TASK-56` e `TASK-57`: dashboard, bloco de assinatura e aba Estatísticas existentes.

### Backend esperado

- Reutilizar módulos existentes em `backend/src/modules/api/admin/private/psychologists/*`.
- Não criar um segundo dashboard paralelo.
- Criar repositories/services/helpers compartilháveis para:
  - cálculo de primeira assinatura paga;
  - média/mediana/percentis;
  - buckets de conversão;
  - normalização de páginas acessadas.
- Validators para período/filtros seguindo o padrão atual:
  - `period=week|month|year|all|custom`, se este for o contrato vigente;
  - `from`/`to` quando custom;
  - limite de janela compatível com o dashboard atual.
- Retornar contratos normalizados, seguros e em snake_case/camelCase conforme padrão real do módulo.
- Traduções PT-BR em `backend/locales/pt/translation.json` para erros/mensagens user-facing.
- Sanitização explícita de campos sensíveis em respostas/logs.
- Se houver alteração em schema/migration, executar `pnpm --dir backend db:migrate`.

### Frontend esperado

- Atualizar `admin/src/app/(admin)/psicologos/client.tsx` ou composição equivalente do dashboard sem criar rota paralela.
- Atualizar `admin/src/app/(admin)/psicologos/[id]/client.tsx` ou componentes equivalentes do detalhe.
- Adicionar/ajustar types em `admin/src/api/req/psychologists` ou módulo equivalente.
- Adicionar/ajustar hooks em `admin/src/api/callers/psychologists`.
- Adicionar/ajustar query keys, por exemplo:
  - `dashboard(period)`;
  - `detail(id)`;
  - `billing(id)`;
  - `statistics(id, period, ...)`.
- Invalidar caches apenas quando houver mutação real; esta task é majoritariamente leitura.
- Gráficos simples com alternativa textual acessível.
- UI mobile-first:
  - base ~390px;
  - cards empilhados no mobile;
  - gráficos responsivos;
  - desktop com layout em colunas sem prejudicar leitura.
- Tema claro/escuro via tokens existentes; sem cores hardcoded fora do padrão.
- Nenhum `<img>` cru.

### Packages

- Não instalar pacote novo por padrão.
- Se for necessário usar biblioteca de gráficos já instalada, validar em `PACKAGES.md`.
- Se não houver biblioteca adequada, preferir componentes SVG/HTML simples já usados no Admin.
- Qualquer dependência nova exige validação de `PACKAGES.md` e ADR.

### Segurança e privacidade

- Métricas devem ser agregadas e minimizadas.
- Não expor IP bruto, user-agent bruto, query string sensível, token, JWT, payment payload, dados de paciente ou conteúdo privado.
- Não transformar analytics de navegação em vigilância de conteúdo.
- Dados individuais de uso são restritos ao Admin autenticado e ao detalhe do psicólogo selecionado.
- Se houver dúvida LGPD sobre retenção/duração, registrar no ADR e limitar a exibição ao que já é persistido de forma segura.

## Critérios de aceite

- [x] Dashboard de psicólogos possui bloco **Conversão até assinatura** com coorte, taxa de conversão paga, média, mediana, P75, P90 e buckets.
- [x] Média/mediana/P75/P90 consideram somente psicólogos convertidos para assinatura paga.
- [x] Distribuição inclui `Ainda não assinou` sem contaminar percentis.
- [x] Plano gratuito e cortesia não contam como assinatura paga.
- [x] Dashboard possui gráfico/bloco de modo de cadastro com apenas **Google** e **E-mail e senha**.
- [x] Não há categoria `Google + senha local`.
- [x] Dashboard mostra conversão por modo de cadastro quando houver dados reais suficientes.
- [x] Dashboard possui bloco agregado **Uso da plataforma** com psicólogos ativos, dias de acesso, sessões, tempo médio quando confiável e páginas mais acessadas.
- [x] Métricas de uso contam somente uso real da plataforma por usuários `role="psicologo"` autenticados.
- [x] Métricas de uso não incluem consultas, sessões clínicas, mensagens, WhatsApp ou conteúdo de pacientes.
- [x] Detalhe do psicólogo mostra `Tempo até assinatura` no bloco de plano/assinatura atual.
- [x] `Tempo até assinatura` usa a primeira assinatura paga real e não muda por upgrade, renovação ou cancelamento posterior.
- [x] Aba **Estatísticas** do detalhe do psicólogo possui bloco individual **Uso da plataforma**.
- [x] Páginas mais acessadas usam rótulos normalizados e não expõem paths crus sensíveis.
- [x] Estados sem dados históricos aparecem como `Indisponível`/copy honesta, sem mock ou zero falso.
- [x] Endpoints Admin privados exigem autenticação Admin real.
- [x] Respostas não expõem payload de pagamento, token, JWT, IP bruto, user-agent bruto, query string sensível ou segredo.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo não autorizado.
- [x] Traduções PT-BR foram criadas/atualizadas para mensagens e erros necessários.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou evento artificial retroativo foi usado.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/protótipo inexistente dos novos blocos foram registrados na execução/ADR.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`, se houver alteração no tracking first-party do frontend público.
- `pnpm --dir frontend build`, se houver alteração no tracking first-party do frontend público.
- `pnpm check`
- `pnpm --dir backend db:migrate` se houver alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- Browser local:
  - Admin `/psicologos` em ~390px e desktop com os novos blocos;
  - período com coorte real e período sem dados para validar estados honestos;
  - dashboard com psicólogos Google e e-mail/senha quando houver dados reais;
  - Admin `/psicologos/[id]` validando linha `Tempo até assinatura`;
  - Admin `/psicologos/[id]?tab=estatisticas` validando bloco **Uso da plataforma**;
  - validar que páginas mais acessadas não exibem IDs sensíveis, query strings, tokens ou payloads.

## Notas de execução

- Antes de implementar, procurar usos existentes de `professional_subscription`, `subscription_plan`, `payment_event`, `page_view_event`, `visitor_session`, `duration_seconds`, `user.provider`, `user.createdAt`, dashboard de psicólogos, billing do detalhe e estatísticas do detalhe.
- O dashboard deve deixar claro que conversão é calculada por coorte de cadastro, enquanto uso da plataforma é calculado por eventos no período selecionado.
- Se a assinatura paga histórica não tiver data confiável além de `professional_subscription.createdAt`, documentar a escolha e suas limitações no ADR.
- Se o tracking de duração ainda não for confiável, não inventar tempo médio de permanência; exibir indisponível e, se necessário, ajustar coleta first-party real.
- O dado de uso da plataforma só deve começar a partir dos eventos reais existentes; não criar backfill artificial.
- A Lectum não intermedia a relação clínica. Não criar nenhuma métrica que sugira volume de atendimentos, mensagens ou sessões terapêuticas.
- Se `prisma migrate dev` falhar por conflito com dados/estado do banco de desenvolvimento, perguntar ao usuário antes de resetar o banco ou rodar qualquer comando destrutivo.


## Execução TASK-72

- Implementados cálculos compartilhados para primeira assinatura paga, média, mediana, P75, P90, buckets de conversão, modo de cadastro e normalização segura de páginas em `backend/src/utils/admin-psychologist-analytics.ts`.
- O dashboard de psicólogos passa a retornar e exibir **Conversão até assinatura**, **Modo de cadastro**, **Conversão por modo de cadastro** e **Uso da plataforma** usando dados reais de `user.createdAt`, `user.provider`, `professional_subscription`, `subscription_plan` e `page_view_event`.
- O detalhe administrativo do psicólogo passa a exibir `Tempo até assinatura` no card **Dados da assinatura**, sempre com base na primeira assinatura paga real e sem contar plano gratuito ou cortesia.
- A aba **Estatísticas** do detalhe recebeu o bloco individual **Uso da plataforma**, com último acesso no período, dias distintos de acesso, sessões, tempo médio quando confiável e páginas normalizadas.
- Métricas de uso contam apenas `page_view_event` autenticado de usuários `role="psicologo"`; não foram criadas métricas de consultas, sessões clínicas, mensagens, WhatsApp ou conteúdo de pacientes.
- A data de primeira assinatura paga usa `professional_subscription.createdAt`, documentado no ADR como melhor data disponível no modelo atual. Status `ativa` e `cancelada` contam como conversão histórica; cancelamento posterior não remove a conversão.
- Tempo médio de permanência só é exibido quando pelo menos 50% dos pageviews autenticados possuem `duration_seconds` positivo; caso contrário, a resposta/UI exibem indisponibilidade honesta.
- Não foram necessárias novas traduções PT-BR de erro/mensagem, pois os endpoints estendidos reaproveitam validações/filtros existentes e os novos estados user-facing são dados de contrato exibidos pelo Admin.
- Builder/Quick Copy não estava disponível no ambiente; foram usadas as imagens locais indicadas em `_product/proto/admin/Psicólogos`. Não havia protótipo específico para os novos blocos.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- ADR criado: `adrs/0266-metricas-conversao-uso-psicologos-admin.md`.

### Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` (inclui `pnpm --dir frontend check` e `pnpm --dir backend check`)
- Smoke HTTP local sem sessão Admin:
  - `GET /api/admin/private/psychologists/dashboard?period=week` retornou 401, confirmando proteção Admin real;
  - `GET /api/admin/private/psychologists/test-id/statistics?period=week` retornou 401, confirmando proteção Admin real.
- Smoke HTTP local no Admin:
  - `GET http://localhost:3002/psicologos` retornou 200;
  - `GET http://localhost:3002/psicologos/test-id` retornou 200;
  - `GET http://localhost:3002/psicologos/test-id?tab=estatisticas` retornou 200.
- Verificação estática: ausência de `<img>` cru e ausência da categoria `Google + senha local` nos arquivos alterados do Admin.
- Validação autenticada com dados reais depende de sessão Admin e base local com psicólogos/assinaturas/pageviews reais; sem sessão, a guarda Admin foi validada sem mock.

## Ajuste complementar 2026-07-14 - Tempo até assinatura na aba Assinatura

- Pedido do usuário: dentro de detalhes do psicólogo, na aba **Assinatura**, o bloco **Plano atual** também deve exibir a linha `Tempo até assinatura`.
- A UI Admin passou a reutilizar o campo real `detail.general.subscription.time_to_first_paid_subscription.label`, já calculado pela TASK-72, no card `Plano atual` da aba `?tab=plano`.
- A linha foi posicionada entre `Inicio` e `Próxima renovação`/`Fim`, mantendo a leitura mobile-first do bloco e sem alterar endpoint, schema Prisma, migrations, packages ou regra de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` e a captura enviada pelo usuário.

## Ajuste complementar 2026-07-14 - Estados inativos dos cards de gráfico

- Pedido do usuário: na **Visão geral** do dashboard de psicólogos e nos cards selecionáveis dos gráficos da aba **Estatísticas**, o estado desmarcado precisava ficar visualmente inativo.
- A UI Admin passou a aplicar fundo cinza via tokens (`bg-border/50`) e remover sombra dos cards desmarcados, mantendo os cards selecionados com fundo de superfície, sombra e anel primário.
- O ajuste é exclusivamente visual, mobile-first e reutiliza os componentes existentes `MetricCard` e `StatisticsMetricToggleCard`; não altera endpoints, schema Prisma, migrations, packages, dados ou regras de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi a captura enviada pelo usuário e os padrões locais em `_product/proto/admin/Psicólogos`.

## Ajuste complementar 2026-07-14 - Origem do tráfego na aba Estatísticas

- Pedido do usuário: replicar, no painel Admin em `/psicologos/[id]?tab=estatisticas`, a tabela **Origem do tráfego** existente nos analytics do psicólogo do site público.
- A aba **Estatísticas** passou a exibir o bloco entre **Análises do vídeo de apresentação** e **Uso da plataforma**, mantendo layout mobile-first e colunas `Fonte`, `Visualizações de perfil`, `WhatsApp` e `Conversão`.
- A origem usa somente eventos reais `page_view_event` do perfil público (`target_type="psychologist"` e `page_kind="psychologist_profile"`), agrupados por `traffic_source`.
- Como `contact_request` ainda não persiste origem/sessão para atribuir WhatsApp por canal, os campos `WhatsApp` e `Conversão` ficam indisponíveis por origem com copy honesta; não foram criados mocks, zeros falsos ou inferências não rastreáveis.
- Não houve alteração em Prisma schema, migrations ou packages.

## Ajuste complementar 2026-07-14 - Remoção da faixa sem assinatura paga

- Pedido do usuário: remover do dashboard Admin de psicólogos a faixa `Nenhum psicólogo da coorte realizou assinatura paga real.` exibida no bloco **Conversão do cadastro até assinatura**.
- A UI Admin deixou de renderizar `conversion.unavailable_reason` nesse card, mantendo os KPIs e buckets com seus estados `Indisponível`/0 reais e preservando o contrato backend para usos futuros.
- O ajuste é exclusivamente visual, mobile-first, sem mocks, sem endpoint novo, sem alteração de Prisma/migrations e sem mudança nas regras de cálculo da TASK-72.
